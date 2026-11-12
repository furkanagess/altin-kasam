#!/usr/bin/env bash
# Google Play yükleme anahtarını (upload key) bir kez oluşturur (GENERATE_PASSWORD=1: rastgele şifre):
#   credentials/altin-kasam-upload.jks  ve  credentials/android-signing.env (şifreler; chmod 600)
# credentials/ git'e girmez. Anahtarı ve şifreleri güvenli bir yerde yedekle: kaybolursa Play
# Console'dan yükleme anahtarı sıfırlama talebi gerekir.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/credentials"
STORE="$DIR/altin-kasam-upload.jks"
ENV_FILE="$DIR/android-signing.env"
ALIAS="altin-kasam-upload"

if [ -f "$STORE" ]; then echo "Anahtar zaten var: $STORE"; exit 0; fi
mkdir -p "$DIR"
if [ "${GENERATE_PASSWORD:-0}" = "1" ]; then
  # Etkileşimsiz: güçlü rastgele şifre; yalnızca android-signing.env içine yazılır, ekrana basılmaz.
  PASS="$(openssl rand -base64 33 | tr -dc 'A-Za-z0-9' | head -c 32)"
  CN="${CERT_NAME:-Altin Kasam}"
else
  read -r -s -p "Anahtar deposu şifresi (en az 6 karakter): " PASS; echo
  read -r -s -p "Şifre (tekrar): " PASS2; echo
  [ "$PASS" = "$PASS2" ] || { echo "Şifreler eşleşmiyor"; exit 1; }
  [ "${#PASS}" -ge 6 ] || { echo "Şifre en az 6 karakter olmalı"; exit 1; }
  read -r -p "Ad Soyad / şirket (sertifikada görünür): " CN
fi

keytool -genkeypair -storetype PKCS12 -keystore "$STORE" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$PASS" -keypass "$PASS" -dname "CN=${CN:-Altin Kasam}, O=${CN:-Altin Kasam}, C=TR"

umask 077
cat > "$ENV_FILE" <<ENV
ANDROID_UPLOAD_STORE_FILE=$STORE
ANDROID_UPLOAD_STORE_PASSWORD=$PASS
ANDROID_UPLOAD_KEY_ALIAS=$ALIAS
ANDROID_UPLOAD_KEY_PASSWORD=$PASS
ENV
chmod 600 "$ENV_FILE" "$STORE"
echo "✓ Yükleme anahtarı: $STORE"
echo "✓ İmza ayarları: $ENV_FILE (npm run android:aab bunu kendiliğinden okur)"
