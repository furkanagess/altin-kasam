import { storageGet, storageSet } from '@/src/core/storage/storage';
import type { PriceAlarm } from '@/src/domain/models';

const STORAGE_KEY = 'altin_kasam_alarms_v1';

/** Not alanı alarmla birlikte saklanır; boşsa hiç yazılmaz. */
export type NewAlarmInput = Pick<PriceAlarm, 'assetId' | 'direction' | 'target' | 'note'>;

export const ALARM_NOTE_MAX = 80;

function newId(): string {
  return `alarm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export class AlarmRepository {
  async list(): Promise<PriceAlarm[]> {
    return (await storageGet<PriceAlarm[]>(STORAGE_KEY)) ?? [];
  }

  async add(input: NewAlarmInput): Promise<PriceAlarm[]> {
    const note = input.note?.trim().slice(0, ALARM_NOTE_MAX);
    const alarm: PriceAlarm = { ...input, note: note || undefined, id: newId(), createdAt: new Date().toISOString() };
    const next = [...(await this.list()), alarm];
    await storageSet(STORAGE_KEY, next);
    return next;
  }

  async remove(id: string): Promise<PriceAlarm[]> {
    const next = (await this.list()).filter((a) => a.id !== id);
    await storageSet(STORAGE_KEY, next);
    return next;
  }

  /** Bekleyen alarmın yönünü ve hedefini değiştirir; tetiklenmiş alarma dokunmaz. */
  async update(id: string, patch: Pick<PriceAlarm, 'direction' | 'target'>): Promise<PriceAlarm[]> {
    const next = (await this.list()).map((a) => (a.id === id && !a.triggeredAt ? { ...a, ...patch } : a));
    await storageSet(STORAGE_KEY, next);
    return next;
  }

  async markTriggered(ids: string[], at = new Date()): Promise<PriceAlarm[]> {
    const triggered = new Set(ids);
    const next = (await this.list()).map((a) =>
      triggered.has(a.id) ? { ...a, triggeredAt: at.toISOString() } : a,
    );
    await storageSet(STORAGE_KEY, next);
    return next;
  }

  /** Tetiklenmiş alarmları "görüldü" işaretler (rozet kaybolur). `assetId` verilmezse hepsi. */
  async markSeen(assetId?: string, at = new Date()): Promise<PriceAlarm[]> {
    const next = (await this.list()).map((a) =>
      a.triggeredAt && !a.seenAt && (!assetId || a.assetId === assetId) ? { ...a, seenAt: at.toISOString() } : a,
    );
    await storageSet(STORAGE_KEY, next);
    return next;
  }

  /** Bekleyen alarmlardan güncel TRY alış fiyatıyla koşulu sağlayanlar. */
  due(alarms: PriceAlarm[], priceOf: (assetId: string) => number | undefined): { alarm: PriceAlarm; price: number }[] {
    return alarms.flatMap((alarm) => {
      if (alarm.triggeredAt) return [];
      const price = priceOf(alarm.assetId);
      if (price == null) return [];
      const reached = alarm.direction === 'above' ? price >= alarm.target : price <= alarm.target;
      return reached ? [{ alarm, price }] : [];
    });
  }
}

export const alarmRepository = new AlarmRepository();
