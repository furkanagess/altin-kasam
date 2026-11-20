# app_preview — Altın Kasam proje haritası

> **Yeni bir session / hesap için:** Bir geliştirme isteği geldiğinde tüm repoyu taramak yerine önce bu klasörü oku.
> Aşağıdaki "Hızlı bulma" tablosundan isteğin hangi dosyalara dokunduğunu bul, sadece o dosyaları aç.
>
> Son güncelleme: 19 Kasım 2026 · Sürüm 1.0.1 · Branch: `web-uyarlama`

## Dosyalar

| Dosya | Ne zaman oku |
|---|---|
| [01_MIMARI.md](01_MIMARI.md) | Teknoloji yığını, katmanlar, Provider sırası, kod kuralları, komutlar, ortam değişkenleri |
| [02_EKRANLAR.md](02_EKRANLAR.md) | Her rota (`app/`) ne yapar, nereden açılır, hangi ViewModel'i kullanır |
| [03_VERI_KATMANI.md](03_VERI_KATMANI.md) | ViewModel → Repository → Datasource zinciri, cihaz depolaması, Pro kısıtları |
| [04_UI_BILESENLERI.md](04_UI_BILESENLERI.md) | `src/widgets` atom/molekül/organizmalar, tema, web (geniş ekran) düzeni |
| [05_ALTYAPI.md](05_ALTYAPI.md) | API uçları (`app/api`), `src/server`, Firebase Functions, landing, EAS/derleme, scripts |
| [06_OZELLIK_HARITASI.md](06_OZELLIK_HARITASI.md) | Özellik bazında "şu işi yapmak için şu dosyalar" (alarm, kasa, tur, paywall, widget…) |

## Uygulama tek cümlede

**Altın Kasam**: Türkçe, Expo (SDK 58) / React Native 0.88 uygulaması. Canlı altın-gümüş fiyatları (Hasfiyat/Harem),
sanal altın portföyü ("Kasam"), fiyat alarmları, haftalık analiz + ekonomik takvim, altın/gümüş haber-gönderi akışı
("Topluluk") ve RevenueCat ile Pro abonelik. iOS, Android ve web (`altin-kasam.expo.app`, masaüstü düzeni geliştiriliyor).

## Hızlı bulma (istek → nereye bak)

| İstek türü | İlk bakılacak yer |
|---|---|
| Piyasa/ana ekran, fiyat satırları | `app/(tabs)/index.tsx`, `src/viewmodels/market/MarketProvider.tsx`, `src/widgets/molecules/ExpandablePriceRow.tsx` |
| Fiyat verisi gelmiyor / yanlış | `app/api/prices+api.ts`, `src/server/hasfiyatPrices.ts`, `src/data/datasources/hasfiyatMarketDatasource.ts`, `src/core/constants/hasfiyatPriceMap.ts` |
| Grafik (çizim, periyot, para birimi) | `src/widgets/organisms/PriceChart.tsx`, `src/data/datasources/chartHistoryDatasource.ts`, `app/api/history+api.ts`, `history-long+api.ts` |
| Kasam (portföy), kâr/zarar | `app/(tabs)/portfolio.tsx`, `src/data/repositories/portfolioRepository.ts`, `src/viewmodels/portfolio/*` |
| Varlık ekleme akışı | `app/add-holding/index.tsx`, `src/core/constants/goldAssets.ts`, `portfolioAssets.ts`, `VaultDropAnimation.tsx` |
| Alarm | `app/alarm.tsx`, `src/viewmodels/alarm/AlarmProvider.tsx`, `src/data/repositories/alarmRepository.ts`, `firebase/functions/src/index.ts` (`syncAlarms`, `checkAlarms`) |
| Analiz sekmesi / haftalık analiz | `app/(tabs)/analytics.tsx`, `app/analysis/[id].tsx`, `firebase/public/weekly-analyses.json` |
| Ekonomik takvim / rapor | `app/calendar.tsx`, `app/economic-event/[id].tsx`, `src/server/economicCalendar*.ts`, `EconomicCalendarProvider.tsx` |
| Topluluk akışı, haber | `app/(tabs)/community.tsx`, `CommunityProvider.tsx`, `liveCommunityDatasource.ts`, `src/core/constants/community.ts` |
| Topluluk beklentisi (duygu analizi) | `app/insight.tsx`, `src/data/repositories/insightRepository.ts`, `src/core/constants/insights.ts` |
| Pro / paywall / abonelik | `app/paywall.tsx`, `src/core/constants/premium.ts`, `SubscriptionProvider.tsx`, `useProGate.ts`, `purchasesDatasource.ts` |
| Ayarlar | `app/settings.tsx` |
| İlk açılış (onboarding) / hedef | `app/onboarding.tsx`, `OnboardingDemos.tsx`, `app/goal.tsx`, `GoalProvider.tsx` |
| Uygulama turu (spotlight) | `src/core/constants/tour.ts`, `TourProvider.tsx`, `TourOverlay.tsx`, `TourTarget.tsx` |
| Bildirimler | `src/data/datasources/notificationsDatasource.ts`, `docs/BILDIRIM_SISTEMI.md`, `app/_layout.tsx` (bildirim açılınca yönlendirme) |
| Ana ekran widget'ı | `app/widget.tsx`, `src/homeWidgets/*`, `HomeWidgetProvider.tsx` |
| Hesap bağlama (Google/Apple, yedek) | `AccountProvider.tsx`, `accountRepository.ts`, `firebaseAuthDatasource.ts`, `socialSignInDatasource.ts`, `AccountLinkSection.tsx` |
| Tema / renk / yazı boyutu | `src/core/theme/*` (`useTheme`, `makeStyles`) |
| Web / masaüstü düzeni | `src/core/theme/web/*`, `WebSidebar.tsx`, `WebModalFrame.tsx`, `WideColumns.tsx`, `docs/WEB_UYARLAMA_PLANI.md` |
| Landing sayfası | `firebase/landing/index.html` (+ `.well-known/`) |
| Build / mağaza / sürüm | `app.json`, `eas.json`, `scripts/build-android.sh`, `plugins/*`, README "Yayın (EAS)" |
| Yapılacaklar listesi | `YAPILACAKLAR.md` (kök) — tüm planların tek takip listesi |

## Bu haritayı güncel tutma

Yeni ekran, provider, repository ya da API ucu eklendiğinde ilgili md'ye **bir satır** ekle. Detay yazma; amaç
"nerede?" sorusuna cevap vermek. Davranış detayları zaten kök `README.md` ve `docs/` içinde.
