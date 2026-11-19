import { Platform, TurboModuleRegistry } from 'react-native';

type CrashlyticsModule = typeof import('@react-native-firebase/crashlytics');

/**
 * Firebase Crashlytics. Yerel çökmeler ve yakalanmamış JS hataları SDK tarafından kendiliğinden
 * raporlanır; bu katman yalnızca ek bağlam (son olaylar, ekran) ve ekranda yakalanıp çökmeye
 * dönüşmeyen hataları gönderir.
 *
 * Yerel modül yalnızca Crashlytics içeren yeni bir native build'de vardır. Eski dev build, Expo Go
 * ya da web'de modül yüklenemez; o durumda tüm çağrılar sessizce atlanır. Kişisel ya da parasal
 * veri (tutar, miktar, e-posta) gönderilmez.
 */
let mod: CrashlyticsModule | null | undefined;

function load(): CrashlyticsModule | null {
  if (mod !== undefined) return mod;
  if (Platform.OS === 'web') return (mod = null);
  // Paketi yerel modül yokken içe aktarmak, try/catch'e rağmen geliştirmede hata ekranı açar;
  // bu yüzden önce modülün kayıtlı olduğu (fırlatmayan `get` ile) kontrol edilir.
  if (!TurboModuleRegistry.get('NativeRNFBTurboApp')) return (mod = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m: CrashlyticsModule = require('@react-native-firebase/crashlytics');
    m.getCrashlytics(); // Yerel modül yoksa burada hata verir.
    mod = m;
  } catch {
    mod = null;
  }
  return mod;
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : JSON.stringify(value));
}

export const crashDatasource = {
  /** Rapora eklenecek kısa iz kaydı (ör. olay adı, ekran yolu). */
  log(message: string): void {
    const m = load();
    if (!m) return;
    try {
      m.log(m.getCrashlytics(), message);
    } catch {
      // Raporlama hatası uygulamayı etkilemez.
    }
  },

  /** Çökmeye dönüşmeyen ama bilinmesi gereken hata. */
  recordError(error: unknown, context?: string): void {
    const m = load();
    if (!m) {
      if (__DEV__) console.warn('[crash]', context ?? '', error);
      return;
    }
    try {
      m.recordError(m.getCrashlytics(), toError(error), context);
    } catch {
      // Raporlama hatası uygulamayı etkilemez.
    }
  },

  /** Raporları anonim kullanıcı kimliğiyle eşleştirir (Firebase uid; e-posta değil). */
  async setUserId(uid: string | null): Promise<void> {
    const m = load();
    if (!m) return;
    try {
      await m.setUserId(m.getCrashlytics(), uid ?? '');
    } catch {
      // Raporlama hatası uygulamayı etkilemez.
    }
  },

  async setAttributes(attributes: Record<string, string>): Promise<void> {
    const m = load();
    if (!m) return;
    try {
      await m.setAttributes(m.getCrashlytics(), attributes);
    } catch {
      // Raporlama hatası uygulamayı etkilemez.
    }
  },
};
