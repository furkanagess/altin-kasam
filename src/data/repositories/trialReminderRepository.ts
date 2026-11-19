import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';
import { subscriptionRepository } from '@/src/data/repositories/subscriptionRepository';

const REMINDER_ID = 'pro-trial-ending';
const DAY_MS = 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

/**
 * Ücretsiz deneme bitmeden bir gün önce yerel hatırlatma. Paywall bu sözü verir: kullanıcı
 * denemeyi unutup habersiz ücretlendirilmez, denemeye başlamak da daha kolay karar olur.
 *
 * Her Pro durumu değişiminde çağrılır ve idempotenttir: deneme yoksa, iptal edildiyse (yenilenmeyecek)
 * ya da hatırlatma anı geçtiyse kurulu hatırlatma kaldırılır. Bildirim izni yoksa sessizce atlanır.
 */
export async function syncTrialReminder(isPremium: boolean): Promise<void> {
  try {
    const endsAt = isPremium ? await subscriptionRepository.trialEndsAt() : null;
    const remindAt = endsAt ? new Date(endsAt.getTime() - DAY_MS) : null;
    if (!endsAt || !remindAt || remindAt.getTime() <= Date.now()) {
      await notificationsDatasource.cancel(REMINDER_ID);
      return;
    }
    await notificationsDatasource.scheduleAt(
      REMINDER_ID,
      remindAt,
      'Pro denemen yarın bitiyor',
      `Deneme ${dateFormatter.format(endsAt)} tarihinde biter ve abonelik başlar. Devam etmek istemiyorsan Ayarlar > Aboneliği yönet'ten iptal edebilirsin.`,
      '/settings',
    );
  } catch {
    // Hatırlatma kurulamazsa abonelik akışı etkilenmez.
  }
}
