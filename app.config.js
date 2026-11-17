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
module.exports = ({ config }) => {
  let next = config;
  const googleServices = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(googleServices)) {
    next = { ...next, android: { ...next.android, googleServicesFile: './google-services.json' } };
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
