const fs = require('fs');
const path = require('path');

/**
 * Google ile giriş için iOS'ta gereken URL şeması, iOS OAuth istemci kimliğinin tersidir:
 * `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`.
 */
function googleIosUrlScheme() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!clientId) return null;
  const id = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  return `com.googleusercontent.apps.${id}`;
}

/**
 * `app.json` üzerine yalnızca ilgili ayar varsa eklenenler:
 * - Android'de uygulama kapalıyken gelen bildirim (FCM) için Firebase konsolundan indirilen
 *   `google-services.json` proje köküne konmalıdır. Dosya yoksa derleme çalışır, yalnızca uzaktan bildirim kapalı kalır.
 * - Google ile hesap bağlama: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` tanımlıysa Google Sign-In eklentisi
 *   iOS URL şemasıyla eklenir. Tanımlı değilse Ayarlar'da "Google ile bağla" görünmez.
 */
/**
 * Firebase yapılandırma dosyasının yolu: EAS'ta "file" türündeki ortam değişkeni (ör.
 * `GOOGLE_SERVICES_JSON`) dosyanın yolunu verir; yerelde proje kökündeki dosya kullanılır.
 * Her iki dosya da git dışında tutulur, bu yüzden EAS sunucusunda yalnızca ortam değişkeniyle gelir.
 */
function firebaseFile(envName, fileName) {
  const fromEnv = process.env[envName];
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  const local = path.join(__dirname, fileName);
  return fs.existsSync(local) ? `./${fileName}` : null;
}

/*
 * - Crashlytics ve Analytics: React Native Firebase iki platformda da Firebase dosyası ister. İki dosya da
 *   varsa `@react-native-firebase/app` + `crashlytics` + `analytics` eklentileri ve iOS için zorunlu
 *   `useFrameworks: "dynamic"` ayarı eklenir (v27 SPM kullanır; "static" derlemeyi bozar).
 *   Dosyalardan biri yoksa Crashlytics eklenmez, uygulama yine derlenir.
 */
module.exports = ({ config }) => {
  let next = config;
  const androidFile = firebaseFile('GOOGLE_SERVICES_JSON', 'google-services.json');
  const iosFile = firebaseFile('GOOGLE_SERVICE_INFO_PLIST', 'GoogleService-Info.plist');
  if (androidFile) {
    next = { ...next, android: { ...next.android, googleServicesFile: androidFile } };
  }
  if (androidFile && iosFile) {
    next = {
      ...next,
      ios: { ...next.ios, googleServicesFile: iosFile },
      plugins: [
        ...(next.plugins ?? []),
        '@react-native-firebase/app',
        '@react-native-firebase/crashlytics',
        // Reklam dönüşüm olayları (Google Ads). iOS'ta reklam kimliği (IDFA) toplanmaz:
        // ATT izni gerekmez, Apple Ads atıfı AdServices ile ayrıca çalışır.
        ['@react-native-firebase/analytics', { ios: { withoutAdIdSupport: true } }],
        ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }],
      ],
    };
  } else {
    console.warn('[app.config] Firebase dosyası eksik: Crashlytics bu derlemeye eklenmedi.');
  }
  const iosUrlScheme = googleIosUrlScheme();
  if (iosUrlScheme) {
    next = {
      ...next,
      plugins: [...(next.plugins ?? []), ['@react-native-google-signin/google-signin', { iosUrlScheme }]],
    };
  }
  return next;
};
