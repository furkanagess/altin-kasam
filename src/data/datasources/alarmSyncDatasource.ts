import { storageGet, storageSet } from '@/src/core/storage/storage';
import type { PriceAlarm } from '@/src/domain/models';

/** Firebase `syncAlarms` ucu; boşsa sunucu tarafı alarm kapalıdır ve alarmlar yalnızca cihazda kontrol edilir. */
const SYNC_URL = process.env.EXPO_PUBLIC_ALARM_SYNC_URL;
const INSTALL_KEY = 'altin_kasam_install_id_v1';
const TIMEOUT_MS = 8_000;

/** Bildirim metnini sunucunun kurabilmesi için alarmla birlikte gönderilen görünen değerler. */
export type SyncableAlarm = PriceAlarm & { label: string; noun: string; unit: 'try' | 'ratio' };

export type SyncResult = {
  /** Uygulama kapalıyken sunucunun tetiklediği (ve bildirimini gönderdiği) alarmlar. */
  triggered: { id: string; at: string }[];
};

function randomId(): string {
  const bytes = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36));
  return `i${bytes.join('')}`;
}

/** Cihaza özgü, tahmin edilemez kimlik; sunucuda alarmların sahibini ayırır. Uygulama silinince yenilenir. */
async function installId(): Promise<string> {
  const saved = await storageGet<string>(INSTALL_KEY);
  if (saved) return saved;
  const id = randomId();
  await storageSet(INSTALL_KEY, id);
  return id;
}

export const alarmSyncDatasource = {
  isEnabled(): boolean {
    return Boolean(SYNC_URL);
  },

  /**
   * Bekleyen alarmların tam listesini sunucuyla eşitler (listede olmayanlar sunucuda silinir).
   * Ağ ya da sunucu hatasında `null`: alarmlar cihazda çalışmaya devam eder.
   */
  async sync(pushToken: string, alarms: SyncableAlarm[]): Promise<SyncResult | null> {
    if (!SYNC_URL) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installId: await installId(), pushToken, alarms }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as Partial<SyncResult>;
      return { triggered: Array.isArray(json.triggered) ? json.triggered : [] };
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
};
