# 06 — Özellik haritası (özellik → dokunulacak dosyalar)

Her özellik için uçtan uca zincir: **Ekran → ViewModel → Repository/Datasource → Sabitler → Sunucu**.

## Canlı fiyatlar (Piyasa)
Ekran `app/(tabs)/index.tsx` → `MarketProvider` → `marketRepository` → `hasfiyatMarketDatasource` → `/api/prices` → `src/server/hasfiyatPrices.ts`.
Başlık eşleme `hasfiyatPriceMap.ts` (Harem'de olmayan 18 ayar/Reşat gösterilmez). Satır UI `ExpandablePriceRow`. Bilgi metinleri `marketInfo.ts` + `InfoSheet`.

## Grafikler
`PriceChart` ← `useMarketChart` / `useGoldRateChart` / `useGoldSilverRatioChart` / `usePortfolioChart` ← `chartHistoryDatasource` → `/api/history`, `/api/history-long`, `/api/brent`.
Periyotlar `TIMEFRAMES` (`app.ts`), Pro sınırı `premium.ts`.

## Kasam (portföy)
`portfolio.tsx`, `add-holding/index.tsx`, `position/[assetId].tsx`, `share-vault.tsx` → `PortfolioProvider` → `portfolioRepository`.
Varlık tanımları `goldAssets.ts`, `portfolioAssets.ts`. CSV dışa aktarma `src/utils/portfolioCsv.ts` (Pro: `FREE_EXPORT_USES`). Ücretsiz kalem sınırı → `useProGate`.

## Yatırım hedefi
`onboarding.tsx`, `goal.tsx`, Kasam `GoalCard` → `GoalProvider`, `useGoalProgress` → `goalRepository`. Gram karşılığı `gramGoldEquivalent`.

## Fiyat alarmı
`alarm.tsx` → `AlarmProvider` (+`useAlarmPrices`) → `alarmRepository` (cihaz) + `alarmSyncDatasource` → Firebase `syncAlarms` → `checkAlarms` → `/api/alarm-values`.
Varlıklar `alarmAssets.ts`; ücretsiz sınır `FREE_ALARM_LIMIT`. Bildirim açılınca yönlendirme `app/_layout.tsx` (`notificationsDatasource.onOpen`).

## Haftalık analiz
`analytics.tsx`, `analysis/[id].tsx`, `WeeklyAnalysisCard` → `useWeeklyAnalyses` → `weeklyAnalysisRepository` → `weeklyAnalysisDatasource` → `EXPO_PUBLIC_WEEKLY_ANALYSIS_URL` ya da `/api/weekly`.
İçerik `firebase/public/weekly-analyses.json`; kilit `isWeeklyAnalysisLocked` (`premium.ts`).

## Ekonomik takvim
`calendar.tsx`, `economic-event/[id].tsx`, `EconomicCalendarList`, `EconomicEventRow`, `CalendarPremiumTeaser` → `EconomicCalendarProvider`, `useEconomicReport` → `economicCalendarRepository`, `economicReportRepository` → `/api/calendar`, `/api/calendar-report` → `src/server/economic*.ts`.
Etki/senaryo metinleri `economicCalendar.ts`. Hatırlatma `notificationsDatasource.scheduleAt` (15 dk önce).

## Topluluk akışı
`community.tsx`, `post/[id].tsx`, `reader.tsx`, `sources.tsx` → `CommunityProvider`, `useArticleSummary` → `communityRepository`, `readPostRepository`, `sourceFollowRepository`, `articleRepository` → `liveCommunityDatasource` (Bluesky + RSS) , `/api/article`.
Kaynak listesi `PUBLISHER_FEEDS` (`community.ts`).

## Topluluk beklentisi (Pro)
`InsightCard` (Topluluk), `insight.tsx` → `useMarketInsights` → `insightRepository` → sözlük/eşikler `insights.ts`. Bulanıklık `PremiumBlur`, ibre `SignalGauge`.

## Pro / abonelik
`paywall.tsx`, `premium-benefits.tsx`, `manage-subscription.tsx`, `PaywallHero`, `PaywallFeatureCarousel` → `SubscriptionProvider`, `useProGate` → `subscriptionRepository`, `freeUsageRepository`, `trialReminderRepository` → `purchasesDatasource` (RevenueCat).
Tüm sınırlar ve paywall nedenleri: `src/core/constants/premium.ts`. Kilit görseli `ProMark`, `PremiumLock`.

## Hesap bağlama / yedek
Ayarlar `AccountLinkSection` → `AccountProvider` → `accountRepository` → `firebaseAuthDatasource`, `socialSignInDatasource`, `accountBackupDatasource` → Firebase `account` fonksiyonu.
Yedeklenen anahtarlar `ACCOUNT_SYNC_KEYS` (`account.ts`) — yeni kalıcı veri eklersen buraya da ekle.

## Ana ekran widget'ı (Pro)
`widget.tsx` → `HomeWidgetProvider` → `homeWidgetRepository` → `homeWidgetDatasource` (`expo-widgets`) → `src/homeWidgets/PriceWidget.{ios,android}.tsx`. Seçenekler `homeWidget.ts`. Development build gerekir.

## Bildirimler
`notificationsDatasource.ts` (izin, yerel planlama, açılma dinleyicisi). Kaynaklar: alarm, takvim hatırlatma, takip edilen kaynak, haftalık kasa özeti (`weeklySummaryRepository`), deneme hatırlatma. Ayrıntı `docs/BILDIRIM_SISTEMI.md`.

## Uygulama turu
Adımlar `src/core/constants/tour.ts` (`TOUR_STEPS`) → `TourProvider` + `tourTargets.ts` → ekranlarda `<TourTarget id=…>` → çizim `TourOverlay`. Görüldü bayrağı `tourRepository`.

## Onboarding
`onboarding.tsx` + `OnboardingDemos.tsx`; bitince `GoalProvider.onboardingDone`, tabs layout yönlendirmesi kalkar.

## Ayarlar / tema / yazı boyutu
`settings.tsx` → `useTheme` (`ThemeProvider`: tercih + `FONT_SCALES`), `useSubscription`, `useAccount`, `useHomeWidget`.

## Ölçüm, hata, puanlama
`analyticsDatasource` (olay adları burada), `AnalyticsTracker` (ekran görüntüleme), `crashDatasource` + `app/_layout.tsx` `ErrorBoundary`, `useValueMoments` → `reviewDatasource` / paywall teklifi.

## Ağ durumu
`networkMonitor.ts`, `networkErrors.ts` (`userMessageForError`) → `useNetworkStatus` → `NetworkBanner`.

## Web (masaüstü)
`src/core/theme/web/*`, `WebSidebar`, `WebModalFrame`, `WideColumns`, `DialogHost.web`, `InAppBrowser.web`, `app/+html.tsx`. Plan `docs/WEB_UYARLAMA_PLANI.md`. Önizleme: `.claude/launch.json` → `web` (3847) / `web-prod` (3901).

## Landing sayfası
`firebase/landing/index.html` → Firebase Hosting `altin-kasam` sitesi. Mağaza linkleri `src/core/constants/stores.ts` ile aynı tutulmalı.


## Yasal sayfalar ve topluluk kaynakları (App Store incelemesi)

- Topluluk akışı yalnızca yayıncı RSS'i (`publisherRssCommunitySource.ts`); kullanıcı içeriği (Bluesky) yok → Age Rating'de UGC "No"
- Yasal sayfalar: `scripts/build-legal-pages.mjs` → `firebase/landing/kosullar`, `firebase/landing/gizlilik`; adresler `LEGAL_LINKS` (`premium.ts`)
