import { storageGet, storageSet } from '@/src/core/storage/storage';
import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';

const ENABLED_KEY = 'altin_kasam_weekly_summary_v1';
const NOTIFICATION_ID = 'weekly-vault-summary';
/** Pazar 19.00: hafta kapanmış, kullanıcı genelde evde. `weekday`: 1 = pazar. */
const WHEN = { weekday: 1, hour: 19, minute: 0 };

/**
 * Haftalık kasa özeti hatırlatması (tutunma). Kullanıcıyı haftada bir kasasına geri getirir;
 * yalnızca kasada varlık varsa ve bildirim izni verilmişse kurulur, izin istemez. Ayarlar'dan kapatılabilir.
 */
export const weeklySummaryRepository = {
  async isEnabled(): Promise<boolean> {
    return (await storageGet<boolean>(ENABLED_KEY)) ?? true;
  },

  async setEnabled(enabled: boolean): Promise<void> {
    await storageSet(ENABLED_KEY, enabled);
  },

  /** Durumu bildirime yansıtır; tekrar tekrar çağrılabilir (aynı kimlikle eskisinin yerini alır). */
  async sync(hasHoldings: boolean): Promise<boolean> {
    try {
      if (!hasHoldings || !(await this.isEnabled())) {
        await notificationsDatasource.cancel(NOTIFICATION_ID);
        return false;
      }
      return await notificationsDatasource.scheduleWeekly(
        NOTIFICATION_ID,
        WHEN,
        'Kasanın haftalık özeti',
        'Bu hafta kasanın değeri ve kâr/zararı nasıl değişti? Bir bakışta gör.',
        '/portfolio?src=weekly',
      );
    } catch {
      return false;
    }
  },
};
