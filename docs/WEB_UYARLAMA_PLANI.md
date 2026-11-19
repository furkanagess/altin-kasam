# Altın Kasam — Web Uyarlama Çalışma Planı

> Hazırlanma: 19 Kasım 2026 · Kapsam: `altin-kasam.expo.app` web sürümü (Expo Router, `web.output: "server"`)
> Amaç: Web arayüzünü mobilin birebir gerilmiş hâli olmaktan çıkarıp masaüstü, tablet ve mobil web için ayrı bir düzen ve etkileşim katmanına taşımak. Renk, marka ve veri katmanı ortak kalacak.

---

## 1. Mevcut durum (1440×900 masaüstünde canlı sitede incelendi)

| Bulgu | Etkisi |
|---|---|
| Tüm ekranlar mobil düzende tam genişliğe yayılıyor. Satırlar, kartlar ve butonlar 1440 px boyunca uzuyor. | Okunması zor, "telefon uygulaması tarayıcıda açılmış" hissi veriyor |
| Alt sekme çubuğu (Piyasa / Analiz / Topluluk / Kasam) masaüstünde de altta duruyor | Masaüstü gezinme alışkanlığına uymuyor |
| Sağ altta yüzen "Varlık ekle" FAB'ı her ekranda var | Masaüstünde içeriğin üstüne biniyor |
| **Piyasa grafiği geniş ekranda bozuk**: çizgi solda sıkışıyor, dikey kırmızı çizgiler oluşuyor. Analiz'deki altın/gümüş oranı grafiği ise doğru çiziliyor. | Ana ekrandaki en önemli bileşen kırık (Faz 1'de ilk iş) |
| Modallar (Fiyat alarmı, Varlık ekle) tam sayfa açılıyor. Alarmın 6 yüzde butonu tüm genişliğe yayılıyor. | Expo Router web'de `presentation: 'modal'` artık normal stack sayfası olarak çiziliyor |
| Silme onayları `window.confirm`, alarm bildirimi `window.alert` | Tarayıcının çirkin yerel diyaloğu açılıyor |
| `app/+html.tsx` içinde `body` arka planı sabit açık renk `#F3F0EA` | Koyu temada yükleme anında ve kaydırma sonunda açık renkli şerit görünüyor |
| Uygulama turu, çek-yenile (pull-to-refresh), kaydırarak sekme değiştirme ve haptik gibi dokunmatik kalıplar web'de karşılıksız | Fareyle kullanılamıyor ya da hiçbir şey yapmıyor |
| Yalnızca native çalışan özellikler: push bildirimi, RevenueCat satın alma (web anahtarı `EXPO_PUBLIC_REVENUECAT_WEB_KEY` EAS'te tanımlı değil), Google/Apple ile giriş (web'de kapalı), SecureStore, ana ekran widget'ı, mağaza puanlama | Paywall, hesap bağlama, alarm ve widget ekranları web'de yarım ya da yanıltıcı |

Bugünkü web'e özel kod çok az: yalnızca `InAppBrowser.web.tsx` ve ~20 dosyada `Platform.OS === 'web'` dalı var.

---

## 2. Hedef mimari: "ortak çekirdek, ayrı web kabuğu"

```
src/core/theme/          ← ORTAK: colors, radii, spacing (değişmez)
src/core/theme/web/      ← YENİ: breakpoints, layout, webTypography, elevation, interaction
src/widgets/web/         ← YENİ: web'e özel kabuk ve primitifler (Sidebar, TopBar, Dialog, Popover,
                            ConfirmDialog, DataTable, PageContainer, Grid, HoverCard)
src/widgets/**/X.web.tsx ← Yalnız davranışı gerçekten farklı bileşenlerde platform dosyası
app/**/_layout.web.tsx   ← Web gezinme kabuğu (Expo Router: yanında platformsuz dosya şart)
```

**İlkeler**
1. **Veri ve viewmodel katmanı tek.** `src/viewmodels`, `src/data`, `src/domain` web için çatallanmaz. Yalnızca görünüm değişir.
2. **Önce breakpoint, sonra `.web.tsx`.** Ekranlar `useBreakpoint()` ile düzen seçer. Davranış temelden farklıysa (sheet yerine dialog, swipe yerine tıklama) `.web.tsx` dosyası açılır.
3. **Mobil web = bugünkü mobil tasarım.** `compact` breakpoint'te mevcut native düzen korunur. Uyarlama `medium` ve `expanded` için yapılır.
4. **Native-only özellikler gizlenmez, dürüstçe yönlendirilir.** "Bu özellik uygulamada" kartı ve mağaza bağlantıları gösterilir.

### 2.1 Breakpoint'ler ve düzen token'ları (`src/core/theme/web/`)

| Token | Değer | Kullanım |
|---|---|---|
| `compact` | < 768 px | Mobil web: mevcut düzen, alt sekme çubuğu |
| `medium` | 768–1199 px | Tablet: daraltılmış ikon kenar çubuğu (72 px), 2 sütun |
| `expanded` | ≥ 1200 px | Masaüstü: tam kenar çubuğu (248 px), 2–3 sütun |
| `layout.maxContent` | 1200 px | Sayfa içerik kabı |
| `layout.readable` | 720 px | Analiz metni, makale, ayarlar, formlar |
| `layout.dialog` | 560 / 720 px | Küçük / büyük dialog |
| `layout.gutter` | 24 / 32 px | `medium` / `expanded` sayfa kenar boşluğu |

- `useBreakpoint()`: `useWindowDimensions` üzerine kurulur, native'de her zaman `compact` döner. Böylece native davranış değişmez.
- **Web tipografisi:** Masaüstünde `h1` 32/40, `h2` 22/28, `price` 28/34 ve tablo için `tabular-nums`. Mevcut `typography` korunur, `webTypography` yalnızca `expanded` için üstüne yazar. Ayarlar'daki "Yazı boyutu" ölçeği burada da uygulanır.
- **Etkileşim durumları:** Her `Pressable` için `hovered` (zemin `surface.muted`), `focus-visible` (2 px `brand.gold` halka) ve `cursor: pointer`. `AppButton`, satırlar ve kartlar ortak bir `useWebInteraction` stiline bağlanır.
- **Yükseklik/gölge:** Web'de kartlar için `elevation.sm/md` (CSS `box-shadow`) eklenir. Native'de bugünkü düz kenarlık kalır.

### 2.2 Web kabuğu (Faz 2)

- **`app/(tabs)/_layout.web.tsx`** (`app/(tabs)/_layout.tsx` native için kalır):
  - `expanded`/`medium`: `expo-router/ui` başsız sekmeleri (`Tabs`, `TabList`, `TabTrigger`, `TabSlot`). Solda logo, 4 ana bölüm, ayırıcıdan sonra Takvim, Alarmlar, Ayarlar. En altta "Pro'ya geç" kartı ve App Store / Google Play rozetleri.
  - `compact`: bugünkü alt sekme çubuğu.
  - Daha az işli alternatif: JS `Tabs` için `tabBarPosition: 'left'` + `tabBarVariant: 'material'`. Ancak özelleştirme sınırlı olduğu için başsız sekmeler öneriliyor.
- **Üst çubuk (`TopBar`):** Sayfa başlığı, `PriceTimestamp`, `MarketTicker` (tam genişlik bant), tema anahtarı, Pro rozeti, "Varlık ekle" birincil butonu. FAB web'de kalkar.
- **Modallar:** Expo Router web'de `presentation: 'modal'` artık normal sayfa olarak çiziliyor ve `webModalStyle` kaldırıldı. Önerilen kalıp:
  - Stack'te `presentation: Platform.select({ web: 'transparentModal', default: 'modal' })`, `animation: Platform.select({ web: 'none' })`.
  - `WebModal.web.tsx`: arka plan karartması, ortalanmış dialog, `Escape` ve dış tık ile kapanma, `router.canGoBack()` yoksa `router.replace('/')`.
  - `WebModal.native.tsx`: çocukları olduğu gibi döner.
  - `compact` web'de dialog tam ekran sheet gibi davranır.
- **Sheet'ler** (`FilterSheet`, `InfoSheet`): `expanded`'da bağlandığı butonun yanında açılan popover, `medium`'da ortalanmış dialog.
- **Onaylar:** `window.confirm` ve `window.alert` kullanan 4 yer (`alarm.tsx`, `portfolio.tsx`, `position/[assetId].tsx`, `AlarmProvider`) ortak `ConfirmDialog` ile değişir.
- **Uygulama turu:** Web'de kapalı. Yerine ilk ziyarette tek seferlik "Hoş geldin" şeridi ("Kasan bu tarayıcıda saklanır, telefonda da kullan").
- **Çek-yenile:** Web'de başlıkta yenile ikonu. Veriler zaten periyodik yenileniyor.
- **Klavye:** `/` arama/odak, `g p`/`g a`/`g t`/`g k` bölümler arası geçiş, `Esc` dialog kapatma. Kısayol listesi Ayarlar'da gösterilir.

### 2.3 Bileşen uyarlama tablosu

| Bileşen | Web/geniş ekran davranışı | Yöntem |
|---|---|---|
| `Screen` | `PageContainer` içine alınır: `maxContent`, gutter, isteğe bağlı `aside` (sağ sütun) yuvası. `footer` masaüstünde sabit alt çubuk yerine form sonunda satır içi buton olur. | prop + breakpoint |
| `PriceChart` | **Önce genişlik hatası düzeltilir** (Piyasa'da bozuk). Fare ile crosshair ve hover tooltip, tekerlekle zoom yok, `1G…1Y` seçici grafiğin üst sağında. | hata düzeltme + `.web.tsx` etkileşim |
| `TopTabs` (Altın / Gümüş / Brent pager) | Swipe yerine tıklanan segment kontrolü. `expanded`'da üç varlık yan yana mini kart ve seçilen büyük grafik. | `.web.tsx` |
| `ExpandablePriceRow` / `PriceRow` | `expanded`'da `DataTable` satırı: Ad · Alış · Satış · Değişim · Spark · Alarm. Genişletme, satır altında detay yerine sağ panel. | breakpoint |
| `MarketTicker` | Hover'da durur, öğeye tıklayınca ilgili detay açılır | küçük değişiklik |
| `ScrollRow` (yatay kaydırmalı kartlar) | `medium+`'ta wrap'lenen grid | breakpoint |
| `CurrencySwitcher` / `UnitSwitcher` | Segment kontrolü, hover/focus durumları | stil |
| `PremiumBlur` / `PremiumLock` | `expo-blur` yerine CSS `backdrop-filter: blur()` | `.web.tsx` |
| `FilterSheet`, `InfoSheet` | Popover/dialog (bkz. 2.2) | `.web.tsx` |
| `AddHoldingFab` | Web'de render edilmez; TopBar ve Kasam başlığında buton | `Platform` |
| `TourOverlay`, `TourTarget` | Web'de no-op | `.web.tsx` |
| `InAppBrowser.web` | Yeni sekme (mevcut). `rel="noopener"` doğrulanır. | kontrol |
| `SnackbarProvider` | Sağ altta toast yığını, en fazla 3 adet | stil |
| `NetworkBanner` | TopBar altında ince şerit | stil |
| `PortfolioShareCard` / `share-vault` | `react-native-view-shot` yerine DOM'dan PNG indirme ve Web Share API (destekleniyorsa) | `.web.tsx` |
| `HeaderActions` | TopBar'a taşınır | kabuk |

---

## 3. Ekran ekran uyarlama

Her ekran için: **Masaüstü düzeni** · **Değişecek bileşenler** · **Native-only karşılığı** · **Kabul ölçütü**.

### A. Ana bölümler

#### A1. Piyasa — `app/(tabs)/index.tsx`
- **Masaüstü düzeni:** 12 sütunlu grid.
  - Sol 8 sütun: varlık seçici (Altın/Gümüş/Brent mini kartları), büyük grafik, periyot seçici.
  - Sağ 4 sütun (`aside`): "Altın çeşitleri" fiyat tablosu, para birimi ve birim seçici, Ana ekran widget'ı tanıtım kartının web karşılığı ("Uygulamayı indir").
  - Altında tam genişlik fiyat tablosu (gram, çeyrek, yarım, tam, cumhuriyet, ons, gümüş).
- **Bileşenler:** `PriceChart` (hata ve hover), `TopTabs` → segment, `ExpandablePriceRow` → `DataTable`, `InfoSheet` → popover, `CurrencySwitcher`/`UnitSwitcher`.
- **Native-only:** Widget tanıtım kartı → "Telefonunda ana ekranda gör" ve mağaza bağlantıları.
- **Kabul:** 1440 px'te yatay kaydırma yok. Grafik tüm periyotlarda doğru çiziliyor. Tablo `tabular-nums` ile hizalı. Alarm ikonu hover'da etiket gösteriyor.

#### A2. Analiz — `app/(tabs)/analytics.tsx`
- **Masaüstü düzeni:** 2 sütun.
  - Sol: Altın/gümüş oranı grafiği ve `WeeklyAnalysisCard` (geniş öne çıkan kart).
  - Sağ: `EconomicCalendarList` (yapışkan, kendi içinde kayan, bugün vurgulu).
- **Bileşenler:** `GoldSilverRatioCard`, `PriceChart` (hover), takvim satırı hover ve tıklama ile `economic-event/[id]`. `CalendarPremiumTeaser` web'de paywall'a bağlanır (bkz. D2).
- **Kabul:** Takvim ve grafik aynı anda ekranda. "Tüm açıklamalar ve takvim" bağlantısı `/calendar`'a gidiyor.

#### A3. Topluluk — `app/(tabs)/community.tsx`
- **Masaüstü düzeni:** 3 bölge.
  - Sol: filtreler (kalıcı panel, `FilterSheet` içeriği yerinde).
  - Orta: akış (`readable` genişlik, `PostCard`).
  - Sağ: `InsightCard` "Topluluk beklentisi" ve popüler hashtag'ler.
- **Bileşenler:** `FilterSheet` → kalıcı yan panel (`expanded`) ya da popover (`medium`). Gönderiye tıklayınca `post/[id]`, `expanded`'da sağ panelde önizleme seçeneği.
- **Kabul:** Filtre değişince akış yerinde güncelleniyor, sayfa atlamıyor. Kart genişliği ≤ 720 px.

#### A4. Kasam — `app/(tabs)/portfolio.tsx`
- **Masaüstü düzeni:**
  - Üstte özet şeridi: toplam değer, kâr/zarar, günlük değişim, para birimi seçici.
  - Altında 2 sütun: sol `PortfolioChartCard` ve "Dağılım", sağ `GoalCard` ve hızlı işlemler (Varlık ekle, Paylaş, Dışa aktar).
  - En altta "Varlıklarım" `DataTable`: Varlık · Miktar · Ort. maliyet · Güncel değer · K/Z · işlemler menüsü.
- **Bileşenler:** `HoldingListItem` → tablo satırı, `VaultEmptyState` (ortalanmış, max 560), `VaultDropAnimation` web'de sadeleştirilir, toplu silme → `ConfirmDialog`.
- **Native-only:** Veri tarayıcıda (`localStorage`) tutuluyor. Görünür bir uyarı eklenir: "Kasan bu tarayıcıda saklanır; hesabını bağlarsan cihazlar arası eşitlenir." Hesap bağlama web'de yoksa (bkz. D1) uyarı mağaza bağlantısı verir.
- **Kabul:** 20+ varlıkta tablo sıralanabilir (değer, K/Z). Satır işlemleri klavyeyle erişilebilir.

### B. Varlık akışları

#### B1. Varlık ekle — `app/add-holding/index.tsx` (modal)
- **Masaüstü:** 720 px dialog. Sol adım listesi (Tür → Miktar → Fiyat), sağ form. `GoldAssetCard`/`OtherAssetCard` 3–4 sütun grid (`ScrollRow` grid'e döner). `QuantityStepper` klavye ok tuşlarıyla.
- **Kabul:** `Enter` sonraki adım, `Esc` kapatma. Ücretsiz plan sınırı mesajı dialog içinde. Kayıttan sonra Kasam tablosu güncelleniyor.

#### B2. Varlık detayı — `app/holding/[id].tsx` ve Pozisyon — `app/position/[assetId].tsx`
- **Masaüstü:** Sol özet ve grafik, sağ "Alımlar" tablosu (tarih, miktar, fiyat, K/Z). Silme → `ConfirmDialog`. `medium+`'ta Kasam tablosundan tıklanınca sağ panel (master-detail) seçeneği değerlendirilir.
- **Kabul:** Doğrudan URL ile açılınca geri butonu `/portfolio`'ya dönüyor.

#### B3. Altın türü — `app/gold/[id].tsx` ve Metal — `app/metal/[symbol].tsx`
- **Masaüstü:** Büyük grafik, sağda `PriceStatsTable` (gün içi en düşük/yüksek, haftalık, yıllık), altında "Alarm kur" ve "Kasama ekle" butonları.
- **SEO fırsatı:** Bu sayfalar (ör. `/gold/gram`, `/metal/XAU`) sunucu tarafında başlık ve meta açıklamayla indekslenebilir (bkz. Faz 5).

#### B4. Yatırım hedefi — `app/goal.tsx` (modal)
- **Masaüstü:** 560 px dialog, `GoalForm` tek sütun.

#### B5. Kasa paylaş — `app/share-vault.tsx`
- **Masaüstü:** Dialog: sol önizleme kartı, sağ seçenekler ve "PNG indir" / "Paylaş" (Web Share API varsa) / "Bağlantıyı kopyala".
- **Native-only:** `view-shot` → DOM'dan PNG (`.web.tsx`). Mevcut `fileShareDatasource` web dalı yeniden kullanılır.

### C. İçerik ve okuma ekranları

#### C1. Haftalık analiz — `app/analysis/[id].tsx`
- **Masaüstü:** `readable` (720 px) makale gövdesi, sağda yapışkan "Bu haftanın özeti" ve `SentimentBadge`/`SignalGauge`. Başlık hiyerarşisi `h1/h2`.
- **SEO:** Sunucu render ile başlık, açıklama ve OG görseli. Paylaşılabilir URL.

#### C2. Ekonomik olay / Karar raporu — `app/economic-event/[id].tsx`
- **Masaüstü:** Üstte olay başlığı ve saat, 2 sütun: sol beklenti/açıklanan (`ExpectationRow` → tablo), sağ altın/gümüş tepkisi (`ReactionRow`, mini grafik).

#### C3. Ekonomik takvim — `app/calendar.tsx`
- **Masaüstü:** Hafta görünümü: gün sütunları ya da tarih gruplu tablo (Saat · Ülke · Olay · Önem · Beklenti · Önceki · Açıklanan). Ülke/önem filtresi popover. Premium kilit `PremiumBlur.web`.

#### C4. Topluluk beklentisi — `app/insight.tsx`
- **Masaüstü:** `readable` genişlik, gauge ve dağılım çubukları yan yana.

#### C5. Gönderi — `app/post/[id].tsx`, Okuyucu — `app/reader.tsx`
- **Masaüstü:** Gönderi `readable` genişlikte. Okuyucu web'de yeni sekmeye yönlendirir (mevcut `InAppBrowser.web`). `reader` rotası web'de doğrudan dış bağlantıya `redirect` olabilir.

#### C6. Kaynaklar — `app/sources.tsx`, Veri kaynakları — `app/data-sources.tsx`
- **Masaüstü:** Kart grid'i (2–3 sütun) ve takip butonu hover durumları.

### D. Hesap, ticari ve sistem ekranları

#### D1. Ayarlar — `app/settings.tsx`
- **Masaüstü:** Sol bölüm menüsü (Görünüm, Plan, Uygulama, Destek, Hukuki), sağ `readable` içerik.
- **Web'de gizlenecek ya da dönüşecek satırlar:**
  - "Ana ekran widget'ı", "Uygulama turu", "Uygulamayı puanla" → "Uygulamayı indir" kartı.
  - `AccountLinkSection`: web'de Google/Apple girişi kapalı. Ya Firebase Web Auth popup ile açılır (karar 4.2) ya da "Hesap bağlama uygulamada" bilgisi verilir.
- **Ek:** Klavye kısayolları listesi.

#### D2. Paywall — `app/paywall.tsx`, Pro avantajları — `app/premium-benefits.tsx`
- **Masaüstü:** 2 sütun: sol `PaywallHero` ve özellik listesi (carousel → statik grid), sağ `PlanCard`'lar yan yana (Aylık / Yıllık / Ömür boyu).
- **Native-only:** Web'de satın alma yok (`EXPO_PUBLIC_REVENUECAT_WEB_KEY` tanımsız). Seçenekler karar 4.1'de.
- **Kabul:** Web'de satın alınamayan bir planın "Satın al" butonu hiçbir zaman sessizce başarısız olmuyor.

#### D3. Fiyat alarmı — `app/alarm.tsx` (modal)
- **Masaüstü:** 560 px dialog. Yüzde butonları 3×2 grid (bugün 6'sı tek satıra yayılıyor), hedef fiyat alanı ortada, mevcut alarmlar listesi altta.
- **Native-only:** Web'de push yok. Alarm yalnızca sekme açıkken tetikleniyor (`window.alert`). Seçenekler:
  - (a) Web Notifications API ile tarayıcı bildirimi (sekme açıkken),
  - (b) "Alarmlar telefonda çalar" bilgisi ve mağaza bağlantısı. Karar 4.3.

#### D4. Destek — `app/support.tsx`
- **Masaüstü:** `readable` form. Gönderim sonrası toast.

#### D5. Widget — `app/widget.tsx`
- **Web:** Rota kalır (paylaşılan bağlantılar kırılmasın) ama içerik "Telefonunda widget" tanıtım sayfasına dönüşür: ekran görüntüleri, iOS/Android adımları, mağaza rozetleri. `widget.web.tsx` ve `widget.tsx` birlikte.

#### D6. Karşılama — `app/onboarding.tsx`
- **Masaüstü:** Pager yerine tek sayfalık iki sütun: sol `OnboardingDemos` animasyonu, sağ değer önerisi ve `GoalForm`. "Atla" görünür.
- **Not:** Web'de onboarding bitmeden hiçbir sekme açılmıyor (`(tabs)/_layout` yönlendirmesi). Web ziyaretçisi için onboarding'i isteğe bağlı yapmak (doğrudan Piyasa'ya düşmek) önerilir. Karar 4.4.

#### D7. 404 — `app/+not-found.tsx`
- Kabuk içinde, "Piyasa'ya dön" butonuyla.

#### D8. HTML kabuğu — `app/+html.tsx`
- `body` arka planı `prefers-color-scheme` ile iki renk ve kullanıcı tercihi için `data-theme`.
- `meta description`, Open Graph / Twitter kartları, `theme-color` (açık/koyu), `apple-touch-icon`, `manifest.json` (PWA).
- iOS Safari için `apple-itunes-app` akıllı uygulama bandı.

---

## 4. Karar bekleyen konular (Faz 0)

1. **Web'de ödeme:**
   - (a) RevenueCat Web Billing (Stripe) ile web'den abonelik. Aynı entitlement kullanıldığı için cihazlar arası çalışır.
   - (b) Web'de satın alma yok; paywall "Pro'yu uygulamadan al" ve QR kodu gösterir.
   - Öneri: önce (b), dönüşüm görülürse (a).
2. **Web'de kimlik:** Firebase Web Auth (Google popup, Apple JS) açılsın mı? Açılırsa Kasam cihazlar arası eşitlenir. Açılmazsa web kasası tarayıcıya bağlı kalır.
3. **Web'de alarm:** Web Notifications ve sekme açık gereksinimi, ya da yalnızca uygulamaya yönlendirme.
4. **Web'in rolü:** Tam uygulama mı, yoksa "ücretsiz canlı fiyat + SEO + uygulamaya yönlendirme" vitrini mi? Bu karar D-grubu ekranların derinliğini belirler.

---

## 5. Uygulama fazları

| Faz | İçerik | Çıktı | Tahmini süre |
|---|---|---|---|
| **0** | Kararlar (bölüm 4), masaüstü wireframe'leri (Piyasa, Kasam, Analiz, Topluluk, bir dialog) | Onaylı düzenler | 1–2 gün |
| **1** | Temel: Piyasa grafiği genişlik hatası, `+html` tema arka planı, `breakpoints`/`layout`/`webTypography`/etkileşim token'ları, `useBreakpoint`, `PageContainer`, hover/focus stilleri `AppButton` ve satırlara | Hiçbir ekran bozulmadan geniş ekranda ortalanmış içerik | 2–3 gün |
| **2** | Kabuk: `(tabs)/_layout.web.tsx` kenar çubuğu, `TopBar`, FAB kaldırma, `WebModal` + `transparentModal`, `ConfirmDialog`, popover, tur no-op | Masaüstü gezinme hazır | 3–4 gün |
| **3** | Ana bölümler: A1–A4 | 4 ana ekran masaüstü düzeninde | 5–7 gün |
| **4** | Akışlar ve içerik: B1–B5, C1–C6 | Tüm detay ekranları | 5–6 gün |
| **5** | Hesap/ticari/sistem: D1–D8 ve karar sonuçları (ödeme, kimlik, alarm). SEO: altın türü, metal ve analiz sayfalarında sunucu tarafı meta ve `sitemap.xml` | Web tamam | 4–6 gün |
| **6** | Kalite: erişilebilirlik (klavye, kontrast, `aria-*`), Lighthouse (Performans ≥ 85, Erişilebilirlik ≥ 95), 375/768/1024/1440/1920 px görsel kontrol, açık/koyu tema, Safari/Chrome/Firefox | Yayın | 2–3 gün |

Her faz sonunda:
- `npx expo lint` ve `npx tsc --noEmit` temiz olacak.
- **Native regresyon kontrolü:** iOS simülatörde 4 ana sekme ve alarm modali değişmemiş olacak.
- Web yayını: `npx expo export --platform web` ve ardından `npx eas-cli@latest deploy --prod --environment production`. Not: yalnızca EAS bulut build'i sunucuyu da yayınlar; yerel build'ler yayınlamaz.

---

## 6. Riskler ve dikkat edilecekler

- **Native'i bozmamak:** Tüm web düzeni `useBreakpoint()` (native'de daima `compact`) ya da `.web.tsx` arkasında kalmalı. Ortak bileşenlerde koşulsuz stil değişikliği yapılmaz.
- **Expo Router kuralı:** `app/` içindeki her `.web.tsx` rotanın yanında platformsuz bir karşılığı olmalı (derin bağlantı tutarlılığı). Ayrıntılar için SDK 58 belgelerine bakılmalı. `webModalStyle` artık yok.
- **Tek sunucu, iki istemci:** Web ve native aynı `/api/*` rotalarını kullanıyor. Web için API değişikliği native sürümü de etkiler.
- **Veri saklama farkı:** Web'de kasa `localStorage`'da. Tarayıcı verisi silinince kaybolur ve bu kullanıcıya açıkça söylenmeli.
- **Performans:** Masaüstünde çoklu grafik (Piyasa'da 3 seri) aynı anda çizilecek. Görünmeyen seriler tembel yüklenmeli.
- **Mağaza politikası:** Web'de ödeme açılırsa uygulama içinde web'e yönlendiren ödeme bağlantısı gösterilmemeli (App Store kuralları).
