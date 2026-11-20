# 05 — Sunucu, Firebase, derleme ve dokümanlar

## Expo API uçları (`app/api/*+api.ts`) — EAS Hosting'de çalışır

| Uç | Dosya | Arka plan |
|---|---|---|
| `/api/prices` | `prices+api.ts` | Hasfiyat canlı fiyat (anahtar sunucuda), `src/server/hasfiyatPrices.ts`, önbellek `hasfiyatCache.ts` |
| (kota koruması) | `src/server/upstreamGuard.ts` | Hasfiyat isteği bütçesi (işçi başına dk tavanı) + 429/401 devre kesici; `/api/prices` ve `/api/history` ortak |
| `/api/history` | `history+api.ts` | Harem saatlik/günlük metal geçmişi |
| `/api/history-long` | `history-long+api.ts` | Uzun geçmiş (Yahoo / ons × USDTRY) |
| `/api/brent` | `brent+api.ts` | Brent petrol (Yahoo) |
| `/api/sitemap` | `sitemap+api.ts` | Arama motorları için XML site haritası (`public/robots.txt` işaret eder) |
| `/api/feed` | `feed+api.ts` | Web için yayıncı RSS vekili (yalnızca `PUBLISHER_FEEDS` adresleri; CORS) |
| `/api/calendar` | `calendar+api.ts` | `src/server/economicCalendarService.ts` + `economicCalendarSchedule.ts` + `economicExpectations.ts` |
| `/api/calendar-report?id=` | `calendar-report+api.ts` | `src/server/economicReport.ts` |
| `/api/article?url=` | `article+api.ts` | Haber `og:description` önizleme (SSRF korumalı) |
| `/api/weekly` | `weekly+api.ts` | Haftalık analiz JSON yedeği |
| `/api/alarm-values` | `alarm-values+api.ts` | Cloud Functions için alarm değerleri (`ALARM_SERVER_SECRET`) |

`src/server/dataLicenses.ts`: TCMB / Cleveland Fed ticari izin bayrakları.
**Önemli:** Yerel build `/api` uçlarını yeniden yayına almaz; sunucu ayrı deploy edilir (`npx expo export --platform web` + `eas deploy --environment production`).

## Firebase (`firebase/`, proje `altin-kasam-628d2`)

- `functions/src/index.ts` (tek dosya, ~670 satır):
  - `syncAlarms` (HTTP) — uygulamadan alarm listesi alır (hız sınırlı)
  - `checkAlarms` (zamanlanmış) — fiyatı kontrol edip push gönderir (`?moment=alarm_triggered`)
  - `cleanupAlarms` (24 saatte bir)
  - `weeklyAnalyses` (HTTP)
  - `account` (HTTP) — hesap yedeği/geri yükleme
  - `support` (HTTP) — destek formu
- `firestore.rules`, `firestore.indexes.json`, `firebase.json` (hosting: CORS + önbellek başlıkları)
- `public/weekly-analyses.json` — haftalık analiz içeriği (başa yeni kayıt ekle → `npm run weekly:deploy`)
- `landing/index.html` — `altin-kasam.web.app` mağaza yönlendirme sayfası; `landing/.well-known/` (AASA, assetlinks)
- Kurulum: `docs/FIREBASE_ALARM_KURULUM.md`, `docs/HAFTALIK_ANALIZ_FIREBASE.md`

## Derleme ve yayın

- `app.json`: sürüm, bundle id, intent filters (deep link yolları), eklentiler (expo-widgets, notifications, splash, build-properties…)
- `app.config.js`: app.json üzerine dinamik ayar (ör. `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`'den Google Sign-In iOS URL şeması)
- `eas.json`: `preview` (internal), `production` (autoIncrement, `appVersionSource: remote`, `EXPO_UNSTABLE_DEPLOY_SERVER=1`)
- `plugins/withAndroidReleaseSigning.js` (`credentials/android-signing.env` varsa release imza), `plugins/withAppDisplayName.js`
- `scripts/build-android.sh apk|aab` → `builds/`; `scripts/create-android-upload-key.sh`; `scripts/check-weekly-analyses.mjs`
- `GoogleService-Info.plist`, `google-services.json` kökte (Firebase native)
- `store-assets/` mağaza görselleri; `dist/` web export çıktısı
- `credentials/`, `.env.local`, admin SDK json → **gizli, git'e girmez, içeriğini yazma**

## Dokümanlar (`docs/`) — ne zaman hangisi

| Konu | Dosya |
|---|---|
| Genel yol haritası | `CALISMA_PLANI.md`, kökte `YAPILACAKLAR.md` (tek takip listesi) |
| Bildirimler | `BILDIRIM_SISTEMI.md` |
| Alarm (Firebase) | `FIREBASE_ALARM_KURULUM.md`, `FIYAT_ALARMI_EGITIM.md` |
| Haftalık analiz | `HAFTALIK_ANALIZ_FIREBASE.md` |
| Hasfiyat istekleri | `HASFIYAT_REST_ISTEKLERI.md` |
| Abonelik / Pro | `ABONELIK_MAGAZA_AYARLARI.md`, `BUYUME_VE_ABONELIK_REHBERI.md`, `PRO_FEATURE_FIKIRLERI.md`, `REVENUECAT_PAYWALL_PROMPT.md` |
| Mağaza / ASO | `APP_STORE_METINLERI.md`, `MAGAZA_ASO.md`, `MAGAZA_GORUNURLUK_REHBERI.md` |
| Reklam / büyüme | `REKLAM_*.md`, `SEARCH_ADS_1_AYLIK_PLAN.md`, `GERCEK_BUYUME_PLANI.md`, `ERISIM_YOL_HARITASI.md` |
| Uyumluluk / güvenlik | `UYUMLULUK_RISKLERI.md`, `GUVENLIK_DENETIMI.md`, `legal/` (gizlilik, kullanım koşulları) |
| Web | `WEB_UYARLAMA_PLANI.md` |
| Video / içerik | `VIDEO_ACIKLAMA_VE_PAYLASIM.md`, `16-23_KASIM_ALTIN_ANALIZI.md` |

Kök `README.md` özellik davranışlarının en ayrıntılı açıklamasıdır (fiyat kaynağı, takvim kaynakları, widget, tema, EAS adımları).
