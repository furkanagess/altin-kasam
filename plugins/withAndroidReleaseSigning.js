/**
 * Yerel Android release derlemesini (APK/AAB) Google Play yükleme anahtarıyla imzalar.
 * Anahtar bilgileri ortam değişkenlerinden okunur (scripts/create-android-upload-key.sh üretir);
 * tanımlı değilse Expo şablonundaki gibi debug anahtarı kullanılır. EAS Build kendi imzasını uygular.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// altin-kasam: upload signing';

const SIGNING_CONFIG = `
        ${MARKER}
        release {
            def uploadStore = System.getenv('ANDROID_UPLOAD_STORE_FILE')
            if (uploadStore) {
                storeFile file(uploadStore)
                storePassword System.getenv('ANDROID_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('ANDROID_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_UPLOAD_KEY_PASSWORD')
            }
        }`;

const RELEASE_SIGNING =
  "signingConfig System.getenv('ANDROID_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug";

function applySigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  let next = gradle.replace(/signingConfigs\s*\{/, (match) => `${match}${SIGNING_CONFIG}`);
  // buildTypes içindeki release bloğunun debug imzası.
  next = next.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    (_, before) => `${before}${RELEASE_SIGNING}`,
  );
  if (!next.includes(MARKER) || !next.includes(RELEASE_SIGNING)) {
    throw new Error('withAndroidReleaseSigning: app/build.gradle beklenen biçimde değil');
  }
  return next;
}

module.exports = function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withAndroidReleaseSigning yalnızca Groovy build.gradle destekler');
    }
    mod.modResults.contents = applySigning(mod.modResults.contents);
    return mod;
  });
};
