# 03 — Veri katmanı: ViewModel → Repository → Datasource

## ViewModels (`src/viewmodels/`)

| Klasör / dosya | Hook | Sorumluluk |
|---|---|---|
| `market/MarketProvider.tsx` (en büyük, ~500 satır) | `useMarketViewModel`, `useMarketChart` | Canlı fiyat polling (açıkken `POLL_INTERVAL_MS`, piyasa kapalıyken seyrek), para birimi/periyot, metal grafiği serileri |
| `market/useCurrencySwitcher.ts` | `useCurrencySwitcher`, `useChartCurrencySwitcher`, `useBrentCurrencySwitcher` | TL/USD/EUR seçimi (ücretsizde yalnız TL) |
| `market/useGoldRateChart.ts` | `useGoldRateChart(assetId)` | Altın çeşidi grafiği (`gold/[id]`) |
| `market/useGoldSilverRatioChart.ts` | `useGoldSilverRatioChart` | Rasyo grafiği (Analiz) |
| `market/useMarketTicker.ts` | `useMarketTicker` | Üst kayan şerit |
| `portfolio/PortfolioProvider.tsx` | `usePortfolioViewModel` | Holdings CRUD, değerleme, pozisyonlar, dağılım |
| `portfolio/usePortfolioChart.ts` | `usePortfolioChart` | Toplam varlık grafiği (`portfolioRepository.valueSeries`) |
| `alarm/AlarmProvider.tsx` | `useAlarms` | Alarmlar, tetikleme kontrolü, sunucu senkronu |
| `alarm/useAlarmPrices.ts` | `useAlarmPrices` | Alarm varlıklarının güncel değerleri |
| `goal/GoalProvider.tsx` | `useGoal` | Hedef + `onboardingDone` |
| `goal/useGoalProgress.ts` | `useGoalProgress`, `useGramAskPrice` | Hedef ilerlemesi |
| `community/CommunityProvider.tsx` | `useCommunityViewModel` | Akış yükleme, filtreler, okunma, gün değişince yenileme |
| `community/useArticleSummary.ts` | `useArticleSummary(url)` | `/api/article` önizlemesi |
| `insight/useMarketInsights.ts` | `useMarketInsights` | Duygu/sinyal (insightRepository) |
| `analysis/EconomicCalendarProvider.tsx` | `useEconomicCalendar` | Takvim, otomatik yenileme, hatırlatmalar |
| `analysis/useEconomicReport.ts` | `useEconomicReport(id)` | Olay raporu |
| `analysis/useWeeklyAnalyses.ts` | `useWeeklyAnalyses` | Haftalık analiz listesi |
| `subscription/SubscriptionProvider.tsx` | `useSubscription` | RevenueCat durumu, paketler, satın alma/geri yükleme |
| `subscription/useProGate.ts` | `useProGate(feature)` | Ücretsiz kullanım sayacı + paywall'a yönlendirme |
| `account/AccountProvider.tsx` | `useAccount` | Google/Apple bağlama, yedekleme/geri yükleme |
| `widget/HomeWidgetProvider.tsx` | `useHomeWidget` | Widget seçimi, snapshot gönderme |
| `tour/TourProvider.tsx`, `tourTargets.ts` | `useTour` | Uygulama turu durumu, hedef ölçümleri |
| `engagement/useValueMoments.ts` | `useValueMoments` | "Değer anı" → puan isteği / Pro teklifi |
| `snackbar/SnackbarProvider.tsx` | `useSnackbar` | Alt bilgi mesajları |
| `network/useNetworkStatus.ts` | `useNetworkStatus`, `useNetworkRecovery` | Bağlantı durumu (`NetworkBanner`) |

## Repositories (`src/data/repositories/`)

| Dosya | Ne |
|---|---|
| `marketRepository.ts` | Fiyat datasource'u sarar |
| `portfolioRepository.ts` (~400) | Holdings saklama, değerleme, pozisyon/dağılım hesapları, `valueSeries` |
| `alarmRepository.ts` | Alarm saklama (`altin_kasam_alarms_v1`) |
| `goalRepository.ts` | Hedef + onboarding bayrağı |
| `insightRepository.ts` (~250) | Kurala dayalı duygu analizi (sözlük `constants/insights.ts`) |
| `economicCalendarRepository.ts`, `economicReportRepository.ts` | Takvim ve rapor (altın/gümüş yorum kuralları) |
| `weeklyAnalysisRepository.ts` | Haftalık analizler |
| `weeklySummaryRepository.ts` | Pazar akşamı kasa özeti bildirimi |
| `communityRepository.ts`, `articleRepository.ts`, `readPostRepository.ts`, `sourceFollowRepository.ts` | Akış, haber önizleme, okunanlar, takip edilen kaynaklar |
| `subscriptionRepository.ts`, `freeUsageRepository.ts`, `trialReminderRepository.ts` | Abonelik, ücretsiz kullanım sayaçları, deneme hatırlatması |
| `accountRepository.ts` | Hesap yedeği (`ACCOUNT_SYNC_KEYS` → bulut) |
| `homeWidgetRepository.ts` | Widget seçimi + snapshot |
| `goldRateHistoryRepository.ts` | Altın çeşidi geçmişi |
| `tourRepository.ts` | Tur görüldü bayrağı |

## Datasources (`src/data/datasources/`)

- **HTTP temeli:** `http.ts` (`/api/...` → dev'de Metro, release'de `EXPO_PUBLIC_API_ORIGIN`)
- **Fiyat:** `hasfiyatMarketDatasource.ts` (canlı), `marketDatasource.ts` (arayüz), `mockMarketDatasource.ts`, `priceHistoryStore.ts` (cihazda biriken örnekler)
- **Grafik geçmişi:** `chartHistoryDatasource.ts` → `hasfiyatMetalHistoryDatasource.ts`, `hasfiyatHistoryDatasource.ts`, `brentHistoryDatasource.ts`
- **Topluluk:** `liveCommunityDatasource.ts` = `blueskyCommunitySource.ts` + `publisherRssCommunitySource.ts` (`rss.ts`), `mockCommunityDatasource.ts`
- **Analiz/takvim:** `weeklyAnalysisDatasource.ts`, `economicCalendarDatasource.ts`
- **Alarm sunucu senkronu:** `alarmSyncDatasource.ts`
- **Bildirim:** `notificationsDatasource.ts` (yerel bildirim, `scheduleAt`, `onOpen`)
- **Satın alma:** `purchasesDatasource.ts` (RevenueCat)
- **Hesap:** `firebaseAuthDatasource.ts`, `socialSignInDatasource.ts`, `accountBackupDatasource.ts`
- **Ölçüm:** `analyticsDatasource.ts` (PostHog + Firebase olayları), `crashDatasource.ts` (Crashlytics), `conversionDatasource.ts`, `engagementDatasource.ts`
- **Diğer:** `reviewDatasource.ts` (mağaza puanı), `feedbackDatasource.ts`, `supportDatasource.ts`, `fileShareDatasource.ts`, `homeWidgetDatasource.ts`, `promptsDatasource.ts`

## Sabitler (`src/core/constants/`) — iş kuralları burada

| Dosya | İçerik |
|---|---|
| `app.ts` | `APP_NAME`, polling süreleri, `CURRENCIES`, `TIMEFRAMES` (1D/1W/1M/3M/1Y) |
| `premium.ts` | Ücretsiz/Pro sınırları, `PaywallReason`, `PREMIUM_FEATURES`, `LEGAL_LINKS` |
| `goldAssets.ts` | Altın çeşitleri (gram/ziynet/bilezik, yeni/eski), `gramGoldEquivalent` |
| `portfolioAssets.ts` | Metal + nakit varlıklar, kasa grupları, miktar biçimleri |
| `alarmAssets.ts` | Alarm varlıkları (`PORTFOLIO_ALARM_ID`, `RATIO_ALARM_ID`) |
| `hasfiyatPriceMap.ts`, `hasfiyatCache.ts` | Hasfiyat başlık eşlemesi, önbellek süreleri |
| `community.ts`, `hashtags.ts` | `PUBLISHER_FEEDS`, metal filtreleri, konu sorguları |
| `insights.ts` | Olumlu/olumsuz terim sözlüğü, eşikler, gündem konuları |
| `economicCalendar.ts` | Etki notları, senaryolar, hatırlatma süresi |
| `tour.ts` | `TOUR_STEPS` |
| `homeWidget.ts`, `marketInfo.ts` (bilgi sheet metinleri), `analysis.ts`, `dataSources.ts`, `account.ts`, `stores.ts` | |

## Domain (`src/domain/`)
`models/index.ts`: `MetalQuote`, `GoldRate`, `MarketQuotes`, `ChartSeries`, `EconomicEvent`, `WeeklyAnalysis`, `PriceAlarm`,
`Holding`, `PortfolioPosition`, `PortfolioSnapshot`, `InvestmentGoal`, `MetalInsight`, `SubscriptionPackage`, `CommunityPost`, `HomeWidgetProps`…
`enums/index.ts`: `GoldKarat`, `GoldForm`, `MetalSymbol`, `BRENT`, `CommunityPostKind`, `GOLD_PURITY`.
