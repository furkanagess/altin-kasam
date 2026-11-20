# 01 — Mimari ve kurallar

## Yığın

- **Expo SDK 58** (`expo ~58.0.25`), React Native 0.88.1, React 19.3, TypeScript 6, Expo Router 58
- Reanimated 4 + worklets, gesture-handler 3, react-native-svg (grafikler elle SVG ile çizilir)
- RevenueCat (`react-native-purchases`), Firebase (analytics, crashlytics; `@react-native-firebase/*`), PostHog
- `expo-widgets` (iOS/Android ana ekran widget'ı), `expo-notifications` (yerel bildirim), `expo-apple-authentication`, Google Sign-In
- Web: `web.output: "server"` — `app/api/*+api.ts` uçları EAS Hosting'de sunucu olarak çalışır
- Paket yöneticisi: **npm** (`package-lock.json`). Paket eklemek için `npx expo install <paket>`
- `patches/` → `patch-package` (postinstall)
- `android/`, `ios/` **CNG ile üretilir**, elle düzenlenmez; native ayar `app.json` + `plugins/`

> AGENTS.md kuralı: Expo API'lerinde eğitim verisine güvenme, `https://docs.expo.dev/versions/v58.0.0/` dokümanına bak.

## Katmanlar (MVVM)

```
app/ (View, Expo Router ekranları)
  └─ src/viewmodels/*  (React Context Provider + hook: useXxx)
       └─ src/data/repositories/*  (iş kuralları, cihazda saklama)
            └─ src/data/datasources/*  (HTTP, SDK, AsyncStorage, RSS, bildirim…)
src/domain/   models (tipler) + enums (GoldKarat, GoldForm, MetalSymbol, CommunityPostKind)
src/core/     constants, theme, storage, network, dialog, hooks
src/widgets/  atoms / molecules / organisms (atomic UI)
src/server/   yalnızca app/api uçlarının kullandığı sunucu kodu (anahtarlar burada okunur)
src/homeWidgets/  expo-widgets düzenleri (iOS SwiftUI / Android Compose)
src/utils/    format, currency, marketHours, portfolioCsv…
```

Import alias: `@/` = proje kökü (örn. `@/src/core/theme`).

## Provider sırası (`src/providers/AppProviders.tsx`)

Dıştan içe: `Snackbar` → `AnalyticsTracker` → `Account` → `Subscription` → `Goal` → `Market` → `HomeWidget`
→ `Portfolio` → `Alarm` → `Community` → `EconomicCalendar`.
Bir hook başka bir provider'ın verisini kullanıyorsa o provider dışta olmalı (ör. Alarm, Portfolio içinde).

Kök: `app/_layout.tsx` → `GestureHandlerRootView` → `ThemeProvider` → `AppProviders` → `RootNavigator`
(`TourProvider`, `NetworkBanner`, `DialogHost`, `AddHoldingFab`, `TourOverlay`, web'de `WebSidebar`, tüm `Stack.Screen` tanımları).

## Kod kuralları (mevcut kodun izlediği)

- Arayüz metinleri ve kod yorumları **Türkçe**. Fonksiyon/bileşen üstüne kısa `/** … */` açıklaması yazılır.
- Stil: `makeStyles((colors) => ({ … }))` + `useTheme().colors`; sabit renk yok (açık/koyu tema anlık değişir).
- Metin için `AppText` (variant/tone), buton için `AppButton`, ekran sarmalayıcı `Screen` atomu.
- Uyarı/onay: `src/core/dialog/appAlert.ts` (web'de `DialogHost.web.tsx` çizer, `window.confirm` kullanılmaz).
- Kalıcı veri: `src/core/storage/storage.ts` (`storageGet/Set`), anahtarlar `altin_kasam_*_v1` biçiminde.
- Pro kontrolü: `useSubscription().isPremium`, sayaçlı özelliklerde `useProGate(feature)`; sınırlar `src/core/constants/premium.ts`.
- Platforma özel dosya: `X.web.tsx`, `X.ios.tsx`, `X.android.tsx`. Web dalları `Platform.OS === 'web'` ve `useBreakpoint()`.
- Native'de `useBreakpoint()` her zaman `compact` döner → web düzeni native'i etkilemez.

## Komutlar

```bash
npm run web            # http://localhost:3847 (launch.json "web")
npm start              # Expo dev server
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm run android:apk | android:aab | android:keystore
npm run weekly:check | weekly:deploy
```
Bitirmeden önce **lint + typecheck** çalıştır (AGENTS.md).

## Ortam değişkenleri (`.env.example` → `.env.local`)

| Değişken | Nerede okunur |
|---|---|
| `HASFIYAT_API_KEY` (gizli) | `app/api/prices+api.ts`, `src/server/hasfiyatPrices.ts` |
| `FRED_API_KEY`, `EVDS_API_KEY` (gizli) | `src/server/economicCalendarService.ts`, `economicReport.ts` |
| `TCMB_COMMERCIAL_PERMISSION`, `CLEVELAND_FED_PERMISSION` | `src/server/dataLicenses.ts` |
| `ALARM_SERVER_SECRET` (gizli) | `app/api/alarm-values+api.ts` + Firebase |
| `EXPO_PUBLIC_REVENUECAT_*_KEY` | `purchasesDatasource.ts` |
| `EXPO_PUBLIC_API_ORIGIN` | `src/data/datasources/http.ts` (release derlemede API adresi) |
| `EXPO_PUBLIC_WEEKLY_ANALYSIS_URL` | `weeklyAnalysisDatasource.ts` |
| `EXPO_PUBLIC_ALARM_SYNC_URL` | `alarmSyncDatasource.ts` |
| `EXPO_PUBLIC_POSTHOG_*` | `analyticsDatasource.ts` |
| `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_ACCOUNT_API_URL`, `EXPO_PUBLIC_GOOGLE_*` | hesap bağlama (`firebaseAuthDatasource`, `socialSignInDatasource`) |
| `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_STORE_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL` | `premium.ts` (`LEGAL_LINKS`), paylaşım, puan isteği |

Üretim değerleri EAS ortam değişkenlerinde (`eas env:*`). Sırları sohbete/koda yazma.

## Kimlikler

- Bundle/paket: `com.furkanages.altinkasam` · scheme: `altinkasam` · App Group: `group.com.furkanages.altinkasam`
- Firebase projesi: `altin-kasam-628d2` · Landing/deep link domain: `altin-kasam.web.app`
- RevenueCat entitlement: `premium`
