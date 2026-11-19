import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, type DocumentReference, type Firestore, type Query } from 'firebase-admin/firestore';
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
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Uygulama açılışta ve her alarm değişikliğinde eşitler; normal kullanım saatte birkaç istektir. */
const SYNC_LIMIT_PER_INSTALL = 30;
const SYNC_LIMIT_PER_IP = 120;
/**
 * Saatte sunucuya ilk kez alarm yazabilecek yeni kurulum sayısı (tüm uygulama için). `installId`'yi
 * istemci seçtiği için kurulum başına sınır tek başına yetmez; bu tavan, rastgele kimliklerle yapılan
 * toplu kaydın yazma ve depolama maliyetini sınırlar. Aşılırsa alarm yalnızca cihazda çalışır ve
 * cihaz bir sonraki eşitlemede yeniden dener.
 */
const NEW_INSTALLS_PER_HOUR = 200;
/** 30 alarm ≈ 10 KB; fazlası kötüye kullanımdır. */
const MAX_SYNC_BODY_BYTES = 64 * 1024;
/** Bu kadar gün eşitlenmeyen (uygulaması açılmayan) bekleyen alarm silinir; cihaz açılışta yeniden yazar. */
const STALE_PENDING_DAYS = 45;
/** Değişmeyen alarmın `syncedAt` alanı en fazla günde bir yenilenir (gereksiz yazma olmasın). */
const SYNCED_AT_REFRESH_MS = DAY_MS;
/** Bir kontrolde tek sorgudan alınan en fazla tetiklenen alarm; fazlası bir sonraki dakikaya kalır. */
const MAX_HITS_PER_QUERY = 400;
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
  /** Cihazın bu alarmı en son eşitlediği an; eskiyen bekleyen alarmlar bununla temizlenir. */
  syncedAt?: string;
};

type IncomingAlarm = Pick<AlarmDoc, 'assetId' | 'direction' | 'target' | 'label' | 'noun' | 'unit' | 'note'> & {
  id: string;
  createdAt?: string;
};

// --- Hız sınırı -----------------------------------------------------------------------------

/** Hız sınırı sayaçları; `cleanupAlarms` süresi geçenleri siler. */
const RATE_COLLECTION = 'rateLimits';

/** IP'yi belge kimliğinde kullanılabilir hale getirir (IPv6 `:` dahil). */
const ipKey = (ip: string | undefined) => (ip ?? 'unknown').replace(/[^\w.:-]/g, '_');

/**
 * Sabit pencereli sayaç: anahtar başına saatte `limit` istek. Sınır aşıldıysa ya da sayaç
 * okunamadıysa (ör. yoğun yükte transaction çakışması) `false` – kapalı tarafta kalır.
 */
async function takeQuota(key: string, limit: number): Promise<boolean> {
  const ref = db.collection(RATE_COLLECTION).doc(key);
  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const now = Date.now();
      const data = snap.data() as { windowStart: number; count: number } | undefined;
      if (!data || now - data.windowStart >= HOUR_MS) {
        tx.set(ref, { windowStart: now, count: 1 });
        return true;
      }
      if (data.count >= limit) return false;
      tx.update(ref, { count: data.count + 1 });
      return true;
    });
  } catch (error) {
    logger.warn('takeQuota: sayaç okunamadı', { key, error: String(error) });
    return false;
  }
}

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

/** Alarmın sunucudaki kaydı cihazdan gelenle aynı mı (aynıysa yeniden yazılmaz). */
function sameAlarm(current: AlarmDoc, next: IncomingAlarm, pushToken: string): boolean {
  return (
    current.pushToken === pushToken &&
    current.assetId === next.assetId &&
    current.direction === next.direction &&
    current.target === next.target &&
    current.label === next.label &&
    current.noun === next.noun &&
    current.unit === next.unit &&
    (current.note ?? undefined) === next.note
  );
}

/**
 * Cihaz alarm listesini sunucuyla eşitler. Gövde: `{ installId, pushToken, alarms: [...] }` (yalnızca
 * bekleyen alarmlar). Listede olmayan alarmlar silinir. Yanıt, uygulama kapalıyken sunucunun tetiklediği
 * alarmları döner; cihaz bunları yeniden bildirmeden tetiklenmiş sayar.
 *
 * Kötüye kullanıma karşı: gövde boyutu, kurulum ve IP başına saatlik sınır, saatlik yeni kurulum tavanı;
 * yalnızca değişen alarmlar yazılır. Sınır aşılırsa 429 döner, alarm cihazda çalışmaya devam eder.
 */
export const syncAlarms = onRequest({ cors: false, maxInstances: 5 }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method' });
    return;
  }
  if ((req.rawBody?.length ?? 0) > MAX_SYNC_BODY_BYTES) {
    res.status(413).json({ error: 'too_large' });
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

  const [installOk, ipOk] = await Promise.all([
    takeQuota(`sync_i_${installId}`, SYNC_LIMIT_PER_INSTALL),
    takeQuota(`sync_ip_${ipKey(req.ip)}`, SYNC_LIMIT_PER_IP),
  ]);
  if (!installOk || !ipOk) {
    res.status(429).json({ error: 'rate' });
    return;
  }

  const existing = await db.collection('alarms').where('installId', '==', installId).get();
  if (existing.empty && incoming.length && !(await takeQuota('sync_new_installs', NEW_INSTALLS_PER_HOUR))) {
    logger.warn('syncAlarms: saatlik yeni kurulum tavanı doldu');
    res.status(429).json({ error: 'rate' });
    return;
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const byId = new Map(existing.docs.map((d) => [d.id, d.data() as AlarmDoc]));
  const keep = new Set(incoming.map((a) => docId(installId, a.id)));
  const triggered: { id: string; at: string }[] = [];
  const changed: AlarmDoc[] = [];
  const batch = db.batch();
  let writes = 0;

  for (const doc of existing.docs) {
    const data = doc.data() as AlarmDoc;
    if (!keep.has(doc.id)) {
      batch.delete(doc.ref);
      writes += 1;
    } else if (data.triggeredAt) triggered.push({ id: data.alarmId, at: data.triggeredAt });
  }
  for (const a of incoming) {
    const ref = db.collection('alarms').doc(docId(installId, a.id));
    const current = byId.get(ref.id);
    if (current?.triggeredAt) continue; // sunucuda tetiklenmiş; yanıtla bildirilir
    if (current && sameAlarm(current, a, pushToken)) {
      const synced = current.syncedAt ? Date.parse(current.syncedAt) : 0;
      if (now - synced > SYNCED_AT_REFRESH_MS) {
        batch.update(ref, { syncedAt: nowIso });
        writes += 1;
      }
      continue;
    }
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
      createdAt: a.createdAt ?? current?.createdAt ?? nowIso,
      syncedAt: nowIso,
    };
    batch.set(ref, next);
    writes += 1;
    changed.push(next);
  }
  if (writes) await batch.commit();
  if (changed.length) {
    await lowerNearestGap(changed).catch((error: unknown) =>
      logger.warn('syncAlarms: nearestGap güncellenemedi', { error: String(error) }),
    );
  }
  res.json({ triggered });
});

/**
 * Yeni ya da değişen alarm, son fiyata bilinen en yakın hedeften daha yakınsa kontrol sıklığını hemen
 * artırır; aksi halde zamanlanmış kontrol bir sonraki fiyat çekimine kadar (en fazla 15 dk) bunu bilmez.
 */
async function lowerNearestGap(alarms: AlarmDoc[]): Promise<void> {
  const ref = db.collection('meta').doc('poll');
  const state = ((await ref.get()).data() ?? {}) as PollState;
  const gap = Math.min(...alarms.map((a) => gapPercent(a, state.values)));
  if (state.nearestGap == null || gap < state.nearestGap) await ref.set({ nearestGap: gap }, { merge: true });
}

// --- Zamanlanmış kontrol --------------------------------------------------------------------

type PollState = {
  lastFetchAt?: number;
  values?: Record<string, number>;
  /** Son çekimde bekleyen alarmların fiyata en yakın olanının uzaklığı (%); bekleyen yoksa `null`. */
  nearestGap?: number | null;
};

/** Hedefe uzaklık yüzdesi → bir sonraki fiyat çekimine kadar beklenecek süre (ms). */
function intervalFor(gapPercent: number | null): number {
  if (gapPercent == null) return 15 * 60_000; // bekleyen alarm yok
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
    // Uygulama `moment` ile alarmın çaldığını anlar ve uygunsa Pro tanıtımını gösterir.
    data: { path: '/?moment=alarm_triggered' },
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

type Hit = { ref: DocumentReference; alarm: AlarmDoc; price: number };

/**
 * Tek varlık için tetiklenen alarmlar ve kalan en yakın hedefin uzaklığı (%). Okuma sayısı bekleyen
 * alarm sayısından bağımsızdır: dört sorgu + tetiklenen alarm kadar belge.
 * Bileşik dizinler: firebase/firestore.indexes.json.
 */
async function scanAsset(assetId: string, price: number): Promise<{ hits: Hit[]; nearest: number | null }> {
  const base = db.collection('alarms').where('triggeredAt', '==', null).where('assetId', '==', assetId);
  const above = base.where('direction', '==', 'above');
  const below = base.where('direction', '==', 'below');
  const [upHits, downHits, nextUp, nextDown] = await Promise.all([
    above.where('target', '<=', price).limit(MAX_HITS_PER_QUERY).get(),
    below.where('target', '>=', price).limit(MAX_HITS_PER_QUERY).get(),
    above.where('target', '>', price).orderBy('target', 'asc').limit(1).get(),
    below.where('target', '<', price).orderBy('target', 'desc').limit(1).get(),
  ]);
  const hits = [...upHits.docs, ...downHits.docs].map((d) => ({ ref: d.ref, alarm: d.data() as AlarmDoc, price }));
  // Sınıra takıldıysa kalanlar bir sonraki dakikada işlensin.
  if (upHits.size >= MAX_HITS_PER_QUERY || downHits.size >= MAX_HITS_PER_QUERY) return { hits, nearest: 0 };
  const gaps = [...nextUp.docs, ...nextDown.docs].map((d) => gapPercent(d.data() as AlarmDoc, { [assetId]: price }));
  return { hits, nearest: gaps.length ? Math.min(...gaps) : null };
}

/**
 * Her dakika çalışır ama Hasfiyat'a nadiren gider: piyasa kapalıysa ya da en yakın hedef uzaksa fiyat
 * çekilmez (bkz. `intervalFor`). Atlanan dakikalarda yalnızca `meta/poll` okunur; fiyat çekildiğinde
 * varlık başına sorgu yapılır. Böylece okuma maliyeti bekleyen alarm sayısıyla büyümez.
 */
export const checkAlarms = onSchedule(
  { schedule: 'every 1 minutes', timeZone: 'Europe/Istanbul', secrets: [ALARM_SERVER_SECRET], maxInstances: 1 },
  async () => {
    const now = new Date();
    if (marketClosed(now)) {
      logger.info('atlandı: piyasa kapalı');
      return;
    }

    const stateRef = db.collection('meta').doc('poll');
    const state = ((await stateRef.get()).data() ?? {}) as PollState;
    // `nearestGap` hiç yazılmadıysa (ilk çalışma) sık kontrol edilir; bekleyen alarm yoksa (null) seyrek.
    const gap = state.nearestGap === undefined ? 0 : state.nearestGap;
    if (state.lastFetchAt && now.getTime() - state.lastFetchAt < intervalFor(gap) - 5_000) {
      logger.info('atlandı: hedef uzak', { nearestPercent: gap == null ? null : Math.round(gap * 100) / 100 });
      return;
    }

    const values = await fetchValues();
    if (!values) {
      await stateRef.set({ lastFetchAt: now.getTime() }, { merge: true });
      logger.info('fiyat alınamadı');
      return;
    }

    const scans = await Promise.all(
      Object.entries(values)
        .filter(([, price]) => typeof price === 'number' && price > 0)
        .map(([assetId, price]) => scanAsset(assetId, price)),
    );
    const hits = scans.flatMap((s) => s.hits);
    const gaps = scans.flatMap((s) => (s.nearest == null ? [] : [s.nearest]));
    const nearestGap = gaps.length ? Math.min(...gaps) : null;
    await stateRef.set({ lastFetchAt: now.getTime(), values, nearestGap }, { merge: true });
    logger.info('fiyat çekildi', { hits: hits.length, nearestPercent: nearestGap });
    if (!hits.length) return;

    // Önce kalıcı olarak işaretlenir: gönderim sırasında hata olsa da alarm tekrar tetiklenmez.
    for (let i = 0; i < hits.length; i += 450) {
      const batch = db.batch();
      for (const { ref } of hits.slice(i, i + 450)) {
        batch.update(ref, { triggeredAt: now.toISOString(), triggeredAtServer: FieldValue.serverTimestamp() });
      }
      await batch.commit();
    }
    await sendPush(db, hits);
  },
);

async function deleteAll(query: Query): Promise<number> {
  let deleted = 0;
  for (;;) {
    const snap = await query.limit(400).get();
    if (snap.empty) return deleted;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
    if (snap.size < 400) return deleted;
  }
}

/**
 * Günlük temizlik: 14 gündür cihaza bildirilmemiş tetiklenmiş alarmlar, `STALE_PENDING_DAYS` gündür
 * eşitlenmemiş bekleyen alarmlar (cihaz açılışta yeniden yazar) ve süresi geçmiş hız sınırı sayaçları.
 */
export const cleanupAlarms = onSchedule({ schedule: 'every 24 hours', maxInstances: 1 }, async () => {
  const now = Date.now();
  const alarms = db.collection('alarms');
  const triggered = await deleteAll(alarms.where('triggeredAt', '<', new Date(now - 14 * DAY_MS).toISOString()));
  const stale = await deleteAll(
    alarms.where('triggeredAt', '==', null).where('syncedAt', '<', new Date(now - STALE_PENDING_DAYS * DAY_MS).toISOString()),
  );
  const counters = await deleteAll(db.collection(RATE_COLLECTION).where('windowStart', '<', now - 2 * HOUR_MS));
  logger.info('temizlik', { triggered, stale, counters });
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

const SUPPORT_TOPICS: Record<string, string> = {
  problem: 'Sorun bildirimi',
  suggestion: 'Öneri / soru',
};

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function cleanLine(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
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

    const [installOk, ipOk] = await Promise.all([
      takeQuota(`support_i_${installId}`, SUPPORT_LIMIT_PER_HOUR),
      takeQuota(`support_ip_${ipKey(req.ip)}`, SUPPORT_LIMIT_PER_HOUR),
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
