import PostHog from 'posthog-react-native';

/**
 * Ürün analitiği (PostHog). Yalnızca olay adı ve genel nitelikler gönderilir: miktar, tutar, not,
 * e-posta gibi kişisel ya da parasal veri GÖNDERİLMEZ. Anahtar yoksa hiçbir şey gönderilmez
 * (geliştirmede konsola yazılır).
 */
export type AnalyticsEvent =
  | { name: 'app_opened' }
  | { name: 'onboarding_completed'; goalSet: boolean }
  | { name: 'holding_added'; group: 'gold' | 'metal' | 'cash'; first: boolean }
  | { name: 'alarm_created'; mode: 'price' | 'percent'; hasNote: boolean; first: boolean }
  | { name: 'alarm_triggered'; source: 'local' }
  | { name: 'share_card_shared'; ok: boolean }
  | { name: 'paywall_viewed'; reason: string }
  | { name: 'pro_purchased' }
  | { name: 'pro_restored' }
  | { name: 'screen_viewed'; path: string }
  | { name: 'prompt_shown'; kind: 'paywall' | 'review'; moment: string }
  | { name: 'onboarding_step'; step: number };

const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

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
