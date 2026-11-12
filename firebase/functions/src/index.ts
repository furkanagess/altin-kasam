import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

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
type Unit = 'try' | 'ratio';

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
  const unit: Unit = a.unit === 'ratio' ? 'ratio' : 'try';
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
