const fs = require('fs');
const path = require('path');

/**
 * `app.json` üzerine yalnızca dosya varsa eklenenler: Android'de uygulama kapalıyken gelen bildirim
 * (FCM) için Firebase konsolundan indirilen `google-services.json` proje köküne konmalıdır.
 * Dosya yoksa derleme çalışır, yalnızca uzaktan bildirim kapalı kalır.
 */
module.exports = ({ config }) => {
  const googleServices = path.join(__dirname, 'google-services.json');
  if (!fs.existsSync(googleServices)) return config;
  return { ...config, android: { ...config.android, googleServicesFile: './google-services.json' } };
};
