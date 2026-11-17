/**
 * Bağlı hesaba taşınan ve hesapta yedeklenen yerel veriler. Cihaza özgü olanlar (kurulum kimliği,
 * buton konumu, fiyat geçmişi önbelleği, geliştirici anahtarları, tema) bilerek listede yok.
 * Sunucudaki `account` fonksiyonu da yalnızca bu anahtarları kabul eder; ikisi birlikte güncellenmeli.
 */
export const ACCOUNT_SYNC_KEYS = [
  // Kasa
  'altin_kasam_holdings_v1',
  'altin_kasam_goal_v2',
  'altin_kasam_onboarding_v1',
  // Alarmlar
  'altin_kasam_alarms_v1',
  // Abonelik (asıl kaynak RevenueCat; bu yalnızca son bilinen durum ve ücretsiz kullanım hakları)
  'altin_kasam_premium_v1',
  'altin_kasam_free_uses_v1',
  // Analiz ve bildirimler (ekonomik takvim hatırlatmaları)
  'altin_kasam_event_reminders_v1',
  // Haber takibi
  'altin_kasam_followed_sources_v1',
  'altin_kasam_notified_news_v1',
  'altin_kasam_read_posts_v1',
  // Tercihler
  'altin_kasam_currency_v1',
  'altin_kasam_home_widget_v1',
] as const;

export type AccountSyncKey = (typeof ACCOUNT_SYNC_KEYS)[number];

/** Kasa/alarm gibi "kullanıcının emeği" sayılan anahtarlar; çakışmada kullanıcıya sorulur. */
export const ACCOUNT_MEANINGFUL_KEYS: readonly AccountSyncKey[] = [
  'altin_kasam_holdings_v1',
  'altin_kasam_alarms_v1',
  'altin_kasam_goal_v2',
  'altin_kasam_followed_sources_v1',
  'altin_kasam_event_reminders_v1',
];

export type AuthProviderId = 'google' | 'apple';

export const AUTH_PROVIDER_LABELS: Record<AuthProviderId, string> = {
  google: 'Google',
  apple: 'Apple',
};
