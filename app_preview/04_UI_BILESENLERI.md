# 04 — UI bileşenleri, tema, web düzeni

Yeni bileşen yazmadan önce buradakilere bak; çoğu ihtiyaç zaten var.

## Atoms (`src/widgets/atoms/`)
`AppText` (variant/tone), `AppButton`, `Screen` (ekran sarmalayıcı, scroll/padding), `Badge`, `ProMark` (PRO etiketi),
`Spacer`, `TourTarget` (tur hedefi sarmalayıcı), `HeaderCloseButton`, `HeaderSupportButton`, `FlashingText` (fiyat değişim yanıp sönmesi),
ikonlar: `BellIcon`, `ClockIcon`, `FlagIcon`, `GoldAssetIcon`, `MetalIcon`, `PortfolioAssetIcon`, `TabIcon`, `ThemePreferenceIcon`.

## Molecules (`src/widgets/molecules/`)
- Fiyat: `ExpandablePriceRow` (Piyasa satırı), `PriceRow`, `PriceTimestamp`, `UnitSwitcher` (gram/ons), `CurrencySwitcher`
- Kart/liste: `GoldAssetCard`, `OtherAssetCard`, `EconomicEventRow`, `SectionHeader`, `EmptyState`, `VaultEmptyState`, `ScrollRow`
- Girdi: `QuantityStepper`, `CardQuantityControl`, `FilterButton`, `TopTabs`, `HashtagChip`, `FollowButton`
- Pro: `PremiumBlur` (bulanık içerik), `PremiumLock`
- Diğer: `AlarmButton`, `InfoButton`, `FullscreenButton`, `HeaderActions` (sekme header sağı), `SentimentBadge`, `SignalGauge` (ibre), `ReportBadge`
- Web: `WideColumns` (geniş ekranda iki sütun)

## Organisms (`src/widgets/organisms/`)
| Bileşen | Kullanım |
|---|---|
| `PriceChart` (~600) | Tüm fiyat grafikleri (SVG, dokunmatik imleç, periyot) |
| `PortfolioChartCard`, `GoldSilverRatioCard`, `PriceStatsTable` | Grafik kartları |
| `MarketTicker` | Kayan fiyat şeridi |
| `AddHoldingFab` | Yüzen "Varlık ekle" butonu (kök layout'ta) |
| `HoldingListItem`, `GoalCard`, `GoalForm`, `PortfolioShareCard`, `VaultDropAnimation` | Kasam |
| `PostCard`, `InsightCard`, `FilterSheet`, `InfoSheet` | Topluluk / bilgi sheet |
| `WeeklyAnalysisCard`, `EconomicCalendarList`, `CalendarPremiumTeaser` | Analiz |
| `PaywallHero`, `PaywallFeatureCarousel` | Paywall |
| `OnboardingDemos` (~1000) | Onboarding hareketli demoları |
| `TourOverlay` | Spotlight tur katmanı |
| `AccountLinkSection` | Ayarlar > Hesap |
| `NetworkBanner` | Bağlantı yok şeridi |
| `DialogHost` (+`.web.tsx`) | `appAlert` diyalogları |
| `InAppBrowser` (+`.web.tsx`) | `reader` ekranı |
| `WebSidebar`, `WebModalFrame` | Geniş web kabuğu |

## Tema (`src/core/theme/`)
- `ThemeProvider.tsx`: `useTheme()` → `{ colors, scheme, preference, fontScale… }`, `makeStyles(fn)`; tercih: system/light/dark, yazı boyutu `FONT_SCALES`
- `colors.ts` (`lightColors`/`darkColors`; `brand.gold`, `brand.goldDeep`, `brand.ink`, `surface.*`, `text.*`, `border.*`)
- `spacing.ts`, `paddings.ts`, `radii.ts`, `typography.ts`

## Web düzeni (`src/core/theme/web/`)
- `layout.ts`: breakpoint `compact` < 768 ≤ `medium` < 1200 ≤ `expanded`, `webLayout.gutter`
- `useBreakpoint.ts`: native'de daima `compact`; hydrate öncesi `compact`
- `interaction.ts` (hover/cursor), `sheet.ts` (`useSheetPresentation`)
- Kök layout: geniş web'de `WebSidebar` (medium'da daraltılmış), modallar `WebModalFrame`
- Plan ve durum: `docs/WEB_UYARLAMA_PLANI.md` (Faz 1-3 commit edildi; son commit "ana ekranlarda masaüstü iki sütunlu düzen")
