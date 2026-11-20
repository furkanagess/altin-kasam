/**
 * iOS AppDelegate'e `FirebaseApp.configure()` ekler.
 * Nedeni: @react-native-firebase/app 26.x eklentisi bu satırı `factory.startReactNative(` çağrısının
 * üstüne koyar. Expo 58'de React Native'i SceneDelegate başlatır, AppDelegate'te bu çağrı yoktur;
 * eklenti "insertion point" bulamayıp satırı atlar ve Firebase hiç başlatılmaz. Satır burada
 * `super.application(... didFinishLaunchingWithOptions ...)` dönüşünün hemen üstüne eklenir.
 * Satır zaten varsa (ör. eklentinin ileriki bir sürümü eklediyse) dosyaya dokunulmaz.
 *
 * Ayrıca GoogleService-Info.plist `ios/` köküne de kopyalanır: 26.x Crashlytics derleme betiği
 * (SPM dSYM yüklemesi) dosyayı yalnızca `${PROJECT_DIR}/GoogleService-Info.plist` yolunda arar,
 * prebuild ise onu hedef klasörüne (`ios/<Hedef>/`) koyar; bulamayınca derleme durur.
 */
const fs = require('fs');
const path = require('path');
const { withAppDelegate, withDangerousMod } = require('expo/config-plugins');

const CALL = 'FirebaseApp.configure()';
const ANCHOR = /^([ \t]*)return super\.application\(application, didFinishLaunchingWithOptions:/m;

function withPlistAtIosRoot(config) {
  return withDangerousMod(config, [
    'ios',
    (c) => {
      const source = c.ios?.googleServicesFile;
      if (source) {
        fs.copyFileSync(
          path.resolve(c.modRequest.projectRoot, source),
          path.join(c.modRequest.platformProjectRoot, 'GoogleService-Info.plist'),
        );
      }
      return c;
    },
  ]);
}

module.exports = function withFirebaseConfigure(config) {
  config = withPlistAtIosRoot(config);
  return withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') return c;
    let src = c.modResults.contents;
    if (src.includes(CALL)) return c;
    if (!/^[ \t]*import\s+FirebaseCore[ \t]*$/m.test(src)) {
      src = src.replace(/^([ \t]*(?:internal\s+)?import\s+Expo[ \t]*)$/m, '$1\nimport FirebaseCore');
    }
    if (!ANCHOR.test(src)) {
      throw new Error('[withFirebaseConfigure] AppDelegate.swift içinde super.application dönüşü bulunamadı.');
    }
    c.modResults.contents = src.replace(ANCHOR, `$1${CALL}\n\n$&`);
    return c;
  });
};
