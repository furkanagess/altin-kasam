import { getInstallId as installId } from '@/src/core/storage/installId';
import type { PriceAlarm } from '@/src/domain/models';

/** Firebase `syncAlarms` ucu; boşsa sunucu tarafı alarm kapalıdır ve alarmlar yalnızca cihazda kontrol edilir. */
const SYNC_URL = process.env.EXPO_PUBLIC_ALARM_SYNC_URL;
const TIMEOUT_MS = 8_000;

/** Bildirim metnini sunucunun kurabilmesi için alarmla birlikte gönderilen görünen değerler. */
export type SyncableAlarm = PriceAlarm & { label: string; noun: string; unit: 'try' | 'usd' | 'ratio' };

export type SyncResult = {
  /** Uygulama kapalıyken sunucunun tetiklediği (ve bildirimini gönderdiği) alarmlar. */
  triggered: { id: string; at: string }[];
};

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
