import PostHog from 'posthog-react-native';
import { conversionDatasource } from '@/src/data/datasources/conversionDatasource';
import { crashDatasource } from '@/src/data/datasources/crashDatasource';

/**
 * Ürün analitiği (PostHog). Yalnızca olay adı ve genel nitelikler gönderilir: miktar, tutar, not,
 * e-posta gibi kişisel ya da parasal veri GÖNDERİLMEZ. Anahtar yoksa hiçbir şey gönderilmez
 * (geliştirmede konsola yazılır).
 */
/** Abonelik yönetimine geçmeden önce isteğe bağlı sorulan neden. */
export type CancelReason = 'price' | 'not_using' | 'missing_feature' | 'other_app' | 'temporary' | 'other';

export type AnalyticsEvent =
  | { name: 'app_opened' }
  | { name: 'onboarding_completed'; goalSet: boolean }
  | { name: 'holding_added'; group: 'gold' | 'metal' | 'cash'; first: boolean }
  | { name: 'alarm_created'; mode: 'price' | 'percent'; hasNote: boolean; first: boolean }
  | { name: 'alarm_triggered'; source: 'local' }
  | { name: 'share_card_shared'; ok: boolean }
  | { name: 'paywall_viewed'; reason: string }
  | { name: 'pro_purchased'; period: string; trial: boolean; offering: string }
  | { name: 'trial_started'; period: string; offering: string }
  | { name: 'paywall_impression'; reason: string; offering: string; packages: string; hasTrial: boolean }
  | { name: 'notification_permission'; granted: boolean }
  | { name: 'notification_opened'; kind: string }
  | { name: 'weekly_summary_scheduled'; enabled: boolean }
  | { name: 'pro_restored' }
  | { name: 'screen_viewed'; path: string }
  | { name: 'prompt_shown'; kind: 'paywall' | 'review'; moment: string }
  | { name: 'onboarding_step'; step: number }
  | { name: 'account_linked'; provider: 'google' | 'apple'; restored: boolean }
  | { name: 'account_deleted' }
  | { name: 'tour_started' }
  | { name: 'tour_step'; step: number }
  | { name: 'tour_finished'; completed: boolean; step: number }
  | { name: 'subscription_manage_opened'; reason: CancelReason | 'skipped' };

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

/** Reklam optimizasyonu için Firebase'e de giden olaylar (Google Ads dönüşümleri). */
function forwardConversion(event: AnalyticsEvent): void {
  switch (event.name) {
    case 'holding_added':
      if (event.first) conversionDatasource.log('first_holding_added', { group: event.group });
      break;
    case 'alarm_created':
      if (event.first) conversionDatasource.log('first_alarm_created', { mode: event.mode });
      break;
    case 'tour_finished':
      if (event.completed) conversionDatasource.log('tour_completed');
      break;
    case 'paywall_viewed':
      conversionDatasource.log('paywall_viewed', { reason: event.reason });
      break;
    case 'trial_started':
      conversionDatasource.log('trial_started', { period: event.period });
      break;
    case 'pro_purchased':
      conversionDatasource.log('pro_started', { period: event.period, trial: event.trial });
      break;
  }
}

let client: PostHog | null = null;
let attempted = false;

function getClient(): PostHog | null {
  if (client || attempted) return client;
  attempted = true;
  if (!KEY) return null;
  try {
    client = new PostHog(KEY, {
      host: HOST,
      // Ekran ve dokunma kayıtları açılmaz; yalnızca aşağıdaki açık olaylar gönderilir.
      captureAppLifecycleEvents: true,
      enableSessionReplay: false,
    });
  } catch {
    client = null;
  }
  return client;
}

export const analyticsDatasource = {
  isEnabled(): boolean {
    return Boolean(KEY);
  },
  track(event: AnalyticsEvent): void {
    const { name, ...props } = event;
    // Çökme raporunda "çökmeden önce ne oldu" izi: yalnızca olay adı ve ekran yolu.
    crashDatasource.log(name === 'screen_viewed' ? `screen ${event.path}` : name);
    forwardConversion(event);
    const ph = getClient();
    if (!ph) {
      if (__DEV__) console.log('[analytics]', name, props);
      return;
    }
    try {
      ph.capture(name, props);
    } catch {
      // Analitik hatası uygulamayı etkilemez.
    }
  },
};
