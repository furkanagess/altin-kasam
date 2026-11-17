import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import nodemailer from 'nodemailer';

initializeApp();
const db = getFirestore();

/** Uygulama sunucusundaki `/api/alarm-values` adresi (ör. https://altin-kasam.expo.app/api/alarm-values). */
const ALARM_VALUES_URL = defineString('ALARM_VALUES_URL');
/** `/api/alarm-values` ucunun beklediği gizli anahtar (uygulama sunucusundaki `ALARM_SERVER_SECRET`). */
const ALARM_SERVER_SECRET = defineSecret('ALARM_SERVER_SECRET');

const MAX_ALARMS_PER_INSTALL = 30;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Uygulamadaki `ANDROID_CHANNEL_ID` ile aynı olmalı; kanal sesi (coin_chlinc) uygulamada tanımlanır.
const CHANNEL_ID = 'price-alarms-chlinc';

type Direction = 'above' | 'below';
type Unit = 'try' | 'usd' | 'ratio';

type AlarmDoc = {
  installId: string;
  alarmId: string;
  pushToken: string;
  assetId: string;
  direction: Direction;
  target: number;
  /** Bildirim metni için istemcinin gönderdiği görünen değerler. */
  label: string;
  noun: string;
  unit: Unit;
  /** Kullanıcının notu (isteğe bağlı); bildirim metnine eklenir. */
  note?: string;
  triggeredAt: string | null;
  createdAt: string;
};

type IncomingAlarm = Pick<AlarmDoc, 'assetId' | 'direction' | 'target' | 'label' | 'noun' | 'unit' | 'note'> & {
  id: string;
  createdAt?: string;
};

const docId = (installId: string, alarmId: string) => `${installId}_${alarmId}`;
const isText = (v: unknown, max = 80): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

function parseAlarm(raw: unknown): IncomingAlarm | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (!isText(a.id, 64) || !/^[\w-]+$/.test(a.id) || !isText(a.assetId, 64)) return null;
  if (a.direction !== 'above' && a.direction !== 'below') return null;
  if (typeof a.target !== 'number' || !Number.isFinite(a.target) || a.target <= 0) return null;
  if (!isText(a.label) || !isText(a.noun, 20)) return null;
  const unit: Unit = a.unit === 'ratio' ? 'ratio' : a.unit === 'usd' ? 'usd' : 'try';
  return {
    id: a.id,
    assetId: a.assetId,
    direction: a.direction,
    target: a.target,
    label: a.label,
    noun: a.noun,
    unit,
    note: typeof a.note === 'string' && a.note.trim() ? a.note.trim().slice(0, 80) : undefined,
    createdAt: typeof a.createdAt === 'string' ? a.createdAt : undefined,
  };
}

/**
 * Cihaz alarm listesini sunucuyla eşitler. Gövde: `{ installId, pushToken, alarms: [...] }` (yalnızca
 * bekleyen alarmlar). Listede olmayan alarmlar silinir. Yanıt, uygulama kapalıyken sunucunun tetiklediği
 * alarmları döner; cihaz bunları yeniden bildirmeden tetiklenmiş sayar.
 */
export const syncAlarms = onRequest({ cors: false, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method' });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const installId = body.installId;
  const pushToken = body.pushToken;
  if (!isText(installId, 64) || !/^[\w-]{16,}$/.test(installId) || !Array.isArray(body.alarms)) {
    res.status(400).json({ error: 'invalid' });
    return;
  }
  if (!isText(pushToken, 200) || !/^Expo(nent)?PushToken\[.+\]$/.test(pushToken)) {
    res.status(400).json({ error: 'token' });
    return;
  }
  const incoming = body.alarms.map(parseAlarm).filter((a): a is IncomingAlarm => a !== null);
  if (incoming.length > MAX_ALARMS_PER_INSTALL) {
    res.status(400).json({ error: 'too_many' });
    return;
  }

  const existing = await db.collection('alarms').where('installId', '==', installId).get();
  const keep = new Set(incoming.map((a) => docId(installId, a.id)));
  const triggered: { id: string; at: string }[] = [];
  const batch = db.batch();

  for (const doc of existing.docs) {
    const data = doc.data() as AlarmDoc;
    if (!keep.has(doc.id)) batch.delete(doc.ref);
    else if (data.triggeredAt) triggered.push({ id: data.alarmId, at: data.triggeredAt });
  }
  for (const a of incoming) {
    const ref = db.collection('alarms').doc(docId(installId, a.id));
    const current = existing.docs.find((d) => d.id === ref.id)?.data() as AlarmDoc | undefined;
    if (current?.triggeredAt) continue; // sunucuda tetiklenmiş; yanıtla bildirilir
    const next: AlarmDoc = {
      installId,
      alarmId: a.id,
      pushToken,
      assetId: a.assetId,
      direction: a.direction,
      target: a.target,
      label: a.label,
      noun: a.noun,
      unit: a.unit,
      ...(a.note ? { note: a.note } : {}),
      triggeredAt: null,
      createdAt: a.createdAt ?? new Date().toISOString(),
    };
    batch.set(ref, next);
  }
  await batch.commit();
  res.json({ triggered });
});

// --- Zamanlanmış kontrol --------------------------------------------------------------------

type PollState = { lastFetchAt?: number; values?: Record<string, number> };

/** Hedefe uzaklık yüzdesi → bir sonraki fiyat çekimine kadar beklenecek süre (ms). */
function intervalFor(gapPercent: number): number {
  if (gapPercent <= 0.5) return 60_000;
  if (gapPercent <= 1.5) return 2 * 60_000;
  if (gapPercent <= 4) return 5 * 60_000;
  return 15 * 60_000;
}

/** Cumartesi ve pazar 22:00'a kadar (İstanbul) piyasa kapalıdır; fiyat çekilmez. */
function marketClosed(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return weekday === 'Sat' || (weekday === 'Sun' && hour < 22);
}

function gapPercent(alarm: AlarmDoc, values: Record<string, number> | undefined): number {
  const price = values?.[alarm.assetId];
  if (!price) return 0; // bilinmiyorsa sık kontrol et
  return (Math.abs(alarm.target - price) / price) * 100;
}

const NOUN_TITLE: Record<string, string> = { alış: 'Fiyat', değer: 'Değer', rasyo: 'Rasyo' };

function formatValue(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchValues(): Promise<Record<string, number> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const res = await fetch(ALARM_VALUES_URL.value(), {
    headers: { 'x-alarm-secret': ALARM_SERVER_SECRET.value() },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) return null;
  const json = (await res.json()) as { values?: Record<string, number>; stale?: boolean };
  // Eski veriyle alarm tetiklenmez.
  return json.stale ? null : (json.values ?? null);
}

async function sendPush(store: Firestore, hits: { alarm: AlarmDoc; price: number }[]) {
  const messages = hits.map(({ alarm, price }) => ({
    to: alarm.pushToken,
    // iOS: pakete eklenen özel ses dosyası. Android'de ses kanaldan gelir.
    sound: 'coin_chlinc.wav',
    channelId: CHANNEL_ID,
    title: `${alarm.label} Alarmı Tetiklendi`,
    body: `Güncel ${NOUN_TITLE[alarm.noun] ?? 'Fiyat'} ${formatValue(price)}${alarm.note ? ` · ${alarm.note}` : ''}`,
    data: { path: '/' },
  }));
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) continue;
    const { data } = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
    // Geçersiz token'a bağlı alarmlar silinir; cihaz uygulamayı açınca yeniden eşitler.
    const dead = new Set<string>();
    data?.forEach((ticket, idx) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') dead.add(chunk[idx].to);
    });
    if (dead.size) {
      const snap = await store.collection('alarms').where('pushToken', 'in', [...dead].slice(0, 30)).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }
  }
}

/**
 * Her dakika çalışır ama Hasfiyat'a nadiren gider: bekleyen alarm yoksa, piyasa kapalıysa ya da en
 * yakın hedef uzaksa fiyat çekilmez (bkz. `intervalFor`). Fiyat çekimi tek istektir; kullanıcı
 * sayısı arttıkça REST kotası artmaz.
 */
export const checkAlarms = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Europe/Istanbul', secrets: [ALARM_SERVER_SECRET], maxInstances: 1 },
  async () => {
    const now = new Date();
    if (marketClosed(now)) {
      logger.info('atlandı: piyasa kapalı');
      return;
    }

    const snap = await db.collection('alarms').where('triggeredAt', '==', null).get();
    if (snap.empty) {
      logger.info('atlandı: bekleyen alarm yok');
      return;
    }
    const alarms = snap.docs.map((d) => ({ ref: d.ref, data: d.data() as AlarmDoc }));

    const stateRef = db.collection('meta').doc('poll');
    const state = ((await stateRef.get()).data() ?? {}) as PollState;
    const nearest = Math.min(...alarms.map((a) => gapPercent(a.data, state.values)));
    if (state.lastFetchAt && now.getTime() - state.lastFetchAt < intervalFor(nearest) - 5_000) {
      logger.info('atlandı: hedef uzak', { alarms: alarms.length, nearestPercent: Math.round(nearest * 100) / 100 });
      return;
    }

    const values = await fetchValues();
    await stateRef.set({ lastFetchAt: now.getTime(), ...(values ? { values } : {}) }, { merge: true });
    logger.info(values ? 'fiyat çekildi' : 'fiyat alınamadı', { alarms: alarms.length });
    if (!values) return;

    const hits = alarms.flatMap(({ ref, data }) => {
      const price = values[data.assetId];
      if (!price) return [];
      const reached = data.direction === 'above' ? price >= data.target : price <= data.target;
      return reached ? [{ ref, alarm: data, price }] : [];
    });
    if (!hits.length) return;
    logger.info('alarm tetiklendi', { count: hits.length });

    // Önce kalıcı olarak işaretlenir: gönderim sırasında hata olsa da alarm tekrar tetiklenmez.
    const batch = db.batch();
    for (const { ref } of hits) batch.update(ref, { triggeredAt: now.toISOString(), triggeredAtServer: FieldValue.serverTimestamp() });
    await batch.commit();
    await sendPush(db, hits);
  },
);

/** Tetiklenmiş ve 14 gündür cihaza bildirilmemiş alarm kayıtlarını temizler. */
export const cleanupAlarms = onSchedule({ schedule: 'every 24 hours', maxInstances: 1 }, async () => {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const snap = await db.collection('alarms').where('triggeredAt', '<', cutoff).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
});

/**
 * Haftalık analizler: Firestore `weeklyAnalyses/{id}` belgelerini (Firebase Console'dan elle girilir)
 * `published == true` olanlarla herkese açık JSON olarak döner. Şema: docs/HAFTALIK_ANALIZ_FIREBASE.md.
 */
export const weeklyAnalyses = onRequest({ cors: true, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method' });
    return;
  }
  const snap = await db.collection('weeklyAnalyses').where('published', '==', true).get();
  const items = snap.docs
    .map((d) => {
      const { published: _published, ...data } = d.data();
      return { id: d.id, ...data };
    })
    .sort((a, b) => String((b as { weekStart?: string }).weekStart).localeCompare(String((a as { weekStart?: string }).weekStart)))
    .slice(0, 60);
  res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.json(items);
});

// --- Bağlı hesap (Google/Apple) ------------------------------------------------------------

/**
 * Hesaba yedeklenen yerel anahtarlar; uygulamadaki `ACCOUNT_SYNC_KEYS` ile aynı olmalı.
 * Listede olmayan anahtarlar yok sayılır.
 */
const ACCOUNT_KEYS = new Set([
  'altin_kasam_holdings_v1',
  'altin_kasam_goal_v2',
  'altin_kasam_onboarding_v1',
  'altin_kasam_alarms_v1',
  'altin_kasam_premium_v1',
  'altin_kasam_free_uses_v1',
  'altin_kasam_event_reminders_v1',
  'altin_kasam_followed_sources_v1',
  'altin_kasam_notified_news_v1',
  'altin_kasam_read_posts_v1',
  'altin_kasam_currency_v1',
  'altin_kasam_home_widget_v1',
]);
/** Firestore belge sınırı 1 MiB; alan adları ve zaman damgası için pay bırakılır. */
const MAX_ACCOUNT_BYTES = 900_000;

type AccountDoc = { data: Record<string, string>; updatedAt: string };

async function verifiedUid(header: string | undefined): Promise<string | null> {
  const match = /^Bearer (.+)$/.exec(header ?? '');
  if (!match) return null;
  try {
    return (await getAuth().verifyIdToken(match[1], true)).uid;
  } catch {
    return null;
  }
}

function parseAccountData(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  let size = 0;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!ACCOUNT_KEYS.has(key) || typeof value !== 'string') continue;
    try {
      JSON.parse(value);
    } catch {
      continue;
    }
    size += key.length + value.length;
    out[key] = value;
  }
  return size <= MAX_ACCOUNT_BYTES ? out : null;
}

/**
 * Bağlı hesabın verisi: `GET` yedeği döner, `PUT { data }` yedeği değiştirir, `DELETE` hesabı
 * (Firebase Auth kullanıcısı) ve yedeği kalıcı olarak siler. Her istek Firebase kimlik jetonu ister.
 */
export const account = onRequest({ cors: false, maxInstances: 10 }, async (req, res) => {
  const uid = await verifiedUid(req.get('authorization'));
  if (!uid) {
    res.status(401).json({ error: 'auth' });
    return;
  }
  const ref = db.collection('users').doc(uid);

  if (req.method === 'GET') {
    const snap = await ref.get();
    res.json({ snapshot: snap.exists ? (snap.data() as AccountDoc) : null });
    return;
  }

  if (req.method === 'PUT') {
    const data = parseAccountData((req.body as { data?: unknown } | undefined)?.data);
    if (!data) {
      res.status(400).json({ error: 'invalid' });
      return;
    }
    const doc: AccountDoc = { data, updatedAt: new Date().toISOString() };
    await ref.set(doc);
    res.json({ snapshot: doc });
    return;
  }

  if (req.method === 'DELETE') {
    await ref.delete();
    await getAuth()
      .deleteUser(uid)
      .catch((error: unknown) => logger.warn('account delete: auth user', { uid, error: String(error) }));
    res.json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'method' });
});

/** Destek mesajlarının gönderildiği ve geldiği Gmail hesabı; şifre bu hesabın uygulama şifresidir. */
const SUPPORT_EMAIL = 'altinkasamapp@gmail.com';
const SUPPORT_SMTP_PASSWORD = defineSecret('SUPPORT_SMTP_PASSWORD');
const SUPPORT_MESSAGE_MAX = 2000;
/** Bir kurulumdan ve bir IP'den saatte kabul edilen en fazla mesaj. */
const SUPPORT_LIMIT_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

const SUPPORT_TOPICS: Record<string, string> = {
  problem: 'Sorun bildirimi',
  suggestion: 'Öneri / soru',
};

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function cleanLine(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

/**
 * Sabit pencereli sayaç: anahtar başına saatte `SUPPORT_LIMIT_PER_HOUR` istek. Sınır aşıldıysa `false`.
 * Kayıtlar `supportRate` koleksiyonunda tutulur; süresi geçen pencere yeni istekle sıfırlanır.
 */
async function takeSupportQuota(key: string): Promise<boolean> {
  const ref = db.collection('supportRate').doc(key);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { windowStart: number; count: number } | undefined;
    if (!data || now - data.windowStart >= HOUR_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return true;
    }
    if (data.count >= SUPPORT_LIMIT_PER_HOUR) return false;
    tx.update(ref, { count: data.count + 1 });
    return true;
  });
}

/**
 * Uygulama içi destek formu. Gövde: `{ installId, topic, message, email?, meta? }`. Mesaj Firestore'a
 * (`supportMessages`) kaydedilir ve destek adresine e-postayla gönderilir; kullanıcı e-posta yazdıysa
 * "Yanıtla" ona gider. Mail gönderilemese de kayıt kalır.
 */
export const support = onRequest(
  { cors: false, maxInstances: 3, secrets: [SUPPORT_SMTP_PASSWORD] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method' });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const installId = body.installId;
    const topic = typeof body.topic === 'string' && body.topic in SUPPORT_TOPICS ? body.topic : null;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const email = cleanLine(body.email, 120);
    if (!isText(installId, 64) || !/^[\w-]{16,}$/.test(installId) || !topic) {
      res.status(400).json({ error: 'invalid' });
      return;
    }
    if (message.length < 5 || message.length > SUPPORT_MESSAGE_MAX) {
      res.status(400).json({ error: 'message' });
      return;
    }
    if (email && !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'email' });
      return;
    }

    const ip = (req.ip ?? 'unknown').replace(/[^\w.:-]/g, '_');
    const [installOk, ipOk] = await Promise.all([
      takeSupportQuota(`i_${installId}`),
      takeSupportQuota(`ip_${ip}`),
    ]);
    if (!installOk || !ipOk) {
      res.status(429).json({ error: 'rate' });
      return;
    }

    const rawMeta = (body.meta ?? {}) as Record<string, unknown>;
    const meta = {
      appVersion: cleanLine(rawMeta.appVersion, 40),
      os: cleanLine(rawMeta.os, 60),
      model: cleanLine(rawMeta.model, 80),
      premium: rawMeta.premium === true,
    };
    const ref = await db.collection('supportMessages').add({
      installId,
      topic,
      message,
      email: email || null,
      meta,
      createdAt: new Date().toISOString(),
      mailed: false,
    });

    try {
      const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: SUPPORT_EMAIL, pass: SUPPORT_SMTP_PASSWORD.value() },
      });
      await transport.sendMail({
        from: `"Altın Kasam Destek" <${SUPPORT_EMAIL}>`,
        to: SUPPORT_EMAIL,
        replyTo: email || undefined,
        subject: `[${SUPPORT_TOPICS[topic]}] ${message.replace(/\s+/g, ' ').slice(0, 60)}`,
        text: [
          message,
          '',
          '---',
          `Konu: ${SUPPORT_TOPICS[topic]}`,
          `Dönüş adresi: ${email || '(yazılmadı)'}`,
          `Uygulama: ${meta.appVersion || '?'}`,
          `Sistem: ${meta.os || '?'}`,
          `Cihaz: ${meta.model || '?'}`,
          `Pro: ${meta.premium ? 'evet' : 'hayır'}`,
          `Kurulum: ${installId}`,
          `Kayıt: supportMessages/${ref.id}`,
        ].join('\n'),
      });
      await ref.update({ mailed: true });
    } catch (error) {
      // Kayıt Firestore'da kaldığı için kullanıcıya başarılı dönülür; mail sorunu loglardan izlenir.
      logger.error('support: mail gönderilemedi', { id: ref.id, error: String(error) });
    }
    res.json({ ok: true });
  },
);
