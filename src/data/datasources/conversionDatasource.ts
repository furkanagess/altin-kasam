import { Platform, TurboModuleRegistry } from 'react-native';

type AnalyticsModule = typeof import('@react-native-firebase/analytics');

/**
 * Reklam dönüşüm olayları (Firebase Analytics → Google Ads uygulama kampanyası). Ürün analitiği
 * PostHog'da kalır; buraya yalnızca reklam optimizasyonunda hedef olarak kullanılacak birkaç olay
 * gider (bkz. docs/REKLAM_YOL_HARITASI_IOS_ANDROID.md, bölüm 4).
 *
 * Kişisel ya da parasal veri (tutar, miktar, not, e-posta) gönderilmez; yalnızca olay adı ve
 * genel nitelikler. Yerel modül yalnızca Analytics içeren yeni bir native build'de vardır; eski
 * dev build, Expo Go ya da web'de tüm çağrılar sessizce atlanır.
 */
export type ConversionEvent =
  | 'first_holding_added'
  | 'first_alarm_created'
  | 'tour_completed'
  | 'paywall_viewed'
  | 'trial_started'
  | 'pro_started';

let mod: AnalyticsModule | null | undefined;

function load(): AnalyticsModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === 'web') return (mod = null);
  // Paketi yerel modül yokken içe aktarmak geliştirmede hata ekranı açar; önce kayıt kontrolü.
  if (!TurboModuleRegistry.get('NativeRNFBTurboAnalytics')) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m: AnalyticsModule = require('@react-native-firebase/analytics');
    m.getAnalytics(); // Yerel modül yoksa burada hata verir.
    mod = m;
  } catch {
    mod = null;
  }
  return mod;
}

export const conversionDatasource = {
  log(name: ConversionEvent, params?: Record<string, string | number | boolean>): void {
    const m = load();
    if (!m) {
      if (__DEV__) console.log('[conversion]', name, params ?? {});
      return;
    }
    try {
      m.logEvent(m.getAnalytics(), name, params);
    } catch {
      // Analitik hatası uygulamayı etkilemez.
    }
  },
};
