#!/usr/bin/env bash
# Yerel Android release derlemesi: APK (cihazda deneme) ya da AAB (Google Play).
#
# Kullanım:
#   npm run android:apk
#   npm run android:aab
#   API_ORIGIN=https://<proje>.expo.app npm run android:aab   # fiyat/takvim sunucusu
#   CLEAN=1 npm run android:aab                               # android/'ı sıfırdan üret
#
# android/ app.json'dan üretilir (CNG; elle düzenlenmez, git'e girmez). İmza:
# credentials/android-signing.env varsa (scripts/create-android-upload-key.sh) yükleme anahtarı,
# yoksa debug anahtarı kullanılır; debug imzalı AAB Google Play'e yüklenemez.
set -euo pipefail

KIND="${1:-apk}"
case "$KIND" in
  apk) TASK=assembleRelease; SRC=android/app/build/outputs/apk/release/app-release.apk ;;
  aab) TASK=bundleRelease; SRC=android/app/build/outputs/bundle/release/app-release.aab ;;
  *) echo "Kullanım: build-android.sh apk|aab"; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version 2>&1 | grep -q 'version "17'; then
  JAVA_HOME="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  export JAVA_HOME
fi
[ -d "$ANDROID_HOME" ] || { echo "Android SDK bulunamadı: $ANDROID_HOME (ANDROID_HOME ayarla)"; exit 1; }
[ -n "$JAVA_HOME" ] || { echo "JDK 17 bulunamadı (JAVA_HOME ayarla)"; exit 1; }

SIGNING_ENV="credentials/android-signing.env"
if [ -f "$SIGNING_ENV" ]; then
  set -a; source "$SIGNING_ENV"; set +a
  echo "› İmza: yükleme anahtarı ($ANDROID_UPLOAD_STORE_FILE)"
else
  echo "! İmza: debug anahtarı. Google Play için önce: npm run android:keystore"
fi

if [ -n "${API_ORIGIN:-}" ]; then
  export EXPO_PUBLIC_API_ORIGIN="$API_ORIGIN"
  echo "› API sunucusu: $EXPO_PUBLIC_API_ORIGIN"
else
  echo "! API_ORIGIN verilmedi: release derlemede fiyat, grafik, takvim ve haber önizlemesi yayımlanmış"
  echo "  bir sunucu olmadan yüklenmez (bkz. README > Yayın). Örn: API_ORIGIN=https://<proje>.expo.app"
fi

PREBUILD_FLAGS=(--platform android --no-install)
if [ "${CLEAN:-0}" = "1" ] || [ ! -d android ]; then PREBUILD_FLAGS+=(--clean); fi
echo "› android/ güncelleniyor (expo prebuild ${PREBUILD_FLAGS[*]})…"
CI=1 npx expo prebuild "${PREBUILD_FLAGS[@]}"

echo "› Derleniyor (gradle $TASK)…"
(cd android && ./gradlew "$TASK" --console=plain)

VERSION="$(node -p "require('./app.json').expo.version")"
STAMP="$(date +%Y%m%d-%H%M)"
mkdir -p builds
OUT="builds/altin-kasam-${VERSION}-${STAMP}.${KIND}"
cp "$SRC" "$OUT"
echo "✓ Hazır: $OUT ($(du -h "$OUT" | cut -f1))"
