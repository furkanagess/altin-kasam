# Altın Kasam — Çalışma Planı

Senior React Native seviyesinde **MVVM + Provider + Atomic Design** ile mobil uygulama planı.
Fazlar teslimat ve bağımlılığa göre ayrılmıştır; takvim tahmini yoktur.

## Ürün özeti

| Yüzey        | Ne sağlar                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| **Piyasa**   | Altın (14/18/22/24 ayar, çeyrek/yarım/tam/reşat/gram), gümüş, bakır, petrol, platin — canlı fiyat + grafik |
| **Kasam**    | Sanal varlık ekleme; canlı fiyattan net varlık ve P&L takibi                                               |
| **Topluluk** | `#Altın`, `#XAUUSD` vb. hashtag’lerle tweet / blog / yazı feed’i                                           |

## Mimari

```
View (Screen + Widget)
        ↓  bind / command
ViewModel (Provider Context)
        ↓  use-case
Repository
   ├── RemoteDatasource
   ├── LocalDatasource (cache)
   └── MockDatasource (dev / fallback)
        ↓
Domain Models
```

### Kurallar

1. **View** iş kuralı içermez; sadece state okur, komut çağırır.
2. **ViewModel** UI state üretir (`loading | ready | error | stale`), repository kullanır.
3. **Model** domain tipleri + mapper + repository interface.
4. Widget’lar **atomic** katmanda kalır; ekranlar organism kompozisyonudur.
5. Tema değerleri (`colors`, `paddings`, `spacing`, `typography`) tek kaynaktan gelir.

## Klasör sözleşmesi

```
src/
  app/                    # Expo Router screens (View)
  core/
    constants/            # API paths, asset ids, poll intervals
    theme/
      colors.ts
      paddings.ts
      spacing.ts
      typography.ts
      radii.ts
    network/              # http client, ws client
    storage/              # MMKV / AsyncStorage wrappers
  domain/
    models/               # GoldAsset, Holding, CommunityPost, MetalQuote
    enums/                # GoldKarat, GoldForm, MetalUnit, Timeframe
    mappers/              # DTO → domain
  data/
    repositories/
    datasources/          # remote | local | mock
  viewmodels/
    market/
    portfolio/
    community/
    settings/
  widgets/
    atoms/                # AppText, AppIcon, Spacer, Badge
    molecules/            # PriceRow, HashtagChip, SectionHeader
    organisms/            # AssetChart, PortfolioSummary, PostCard
  providers/              # AppProviders composition root
  hooks/                  # ince UI hook’ları
  utils/
```

## Domain çekirdeği

### Altın envanteri (constants)

Tek doğruluk kaynağı: `core/constants/goldAssets.ts`

| Form               | Tipik gram (örnek) | Karat seçenekleri |
| ------------------ | ------------------ | ----------------- |
| Gram               | 1                  | 14 / 18 / 22 / 24 |
| Çeyrek             | ~1.75              | 22 (standart)     |
| Yarım              | ~3.5               | 22                |
| Tam                | ~7                 | 22                |
| Reşat / Cumhuriyet | standart ağırlık   | 22                |

Purity tablosu ViewModel’de hardcode edilmez; constant’tan okunur.

### Ana modeller

- `MetalQuote` — `symbol`, `bid`, `ask`, `changePercent`, `currency`, `timestamp`
- `GoldAsset` — `id`, `karat`, `form`, `purity`, `gramWeight`
- `Holding` — `id`, `assetId`, `quantity`, `costBasis`, `boughtAt`, `note?`
- `PortfolioSnapshot` — `totalValue`, `totalCost`, `pnl`, `pnlPercent`, `series[]`
- `CommunityPost` — `id`, `kind: tweet|blog|article`, `title?`, `body`, `hashtags[]`, `source`, `publishedAt`

## State management (Provider)

Her feature kendi Context + Provider çifti:

| Provider            | Sorumluluk                                       |
| ------------------- | ------------------------------------------------ |
| `MarketProvider`    | quotes, selectedAsset, timeframe, refresh, stale |
| `PortfolioProvider` | holdings CRUD, valuation, history series         |
| `CommunityProvider` | feed, hashtag filter, pagination                 |
| `SettingsProvider`  | tema, datasource mode (mock/live), dil           |

`AppProviders` composition root’ta sırayla sarar. Cross-feature bağımlılık:
`PortfolioViewModel` fiyatı `MarketProvider`’dan (veya shared `QuoteService`) okur — duplicate fetch yok.

## Faz planı

### Faz 0 — Temel iskelet

**Hedef:** Çalışan Expo iskeleti + mimari sözleşmeler.

- Expo SDK + TypeScript strict + Expo Router tabs
- Tema tokenları (`colors`, `paddings`, …)
- Atomic widget bootstrap (en az `AppText`, `AppButton`, `Screen`)
- `BaseViewModel` tipi / provider şablonu
- Path alias `@/`, ESLint, Prettier

**Çıkış:** Boş sekmeler açılır, lint yeşil, token’lar tek kaynak.

### Faz 1 — Piyasa & canlı fiyat

**Hedef:** Emtia fiyatları + grafikler.

- `IMarketRepository` + Mock / Remote datasource
- `MarketViewModel` + ticker / chart UI
- Altın seviyeleri + Ag / Cu / Pt / Oil
- Timeframe: 1D / 1W / 1M / 1Y
- Polling (veya WS) + stale badge

**Çıkış:** Piyasa ekranı mock veya live fiyat gösterir; grafik aralıkları çalışır.

### Faz 2 — Sanal portföy

**Hedef:** Kullanıcı kendi kasasını oluşturur.

- Holding CRUD (MMKV)
- Add Gold sheet: ayar / form / miktar / alış fiyatı
- Canlı valuation + P&L
- Portföy varlık grafiği
- Empty / error / loading durumları

**Çıkış:** Ekle-sil akışı; toplam varlık canlı fiyata göre güncellenir.

### Faz 3 — Topluluk

**Hedef:** Hashtag odaklı içerik alanı.

- Curated mock feed (`#Altın`, `#XAUUSD`, `#Gümüş`, `#Petrol`)
- Post türleri: tweet / blog / article
- Filtre + detail + pull-to-refresh
- Kaynak attribution (telif / ToS güvenliği)

**Çıkış:** Hashtag filtreli feed ve detay okuma tamam.

### Faz 4 — Kalite

- ViewModel unit testleri
- Kritik widget testleri
- ErrorBoundary, offline banner
- Liste/grafik performans (FlashList, downsample)
- a11y label smoke

**Çıkış:** Kritik path testleri geçer.

### Faz 5 — Paketleme

- İkon, splash, store metinleri
- EAS Build (iOS + Android internal)
- Analytics / crash hook noktaları
- API key güvenliği (env, asla bundle’a düz metin)

**Çıkış:** Internal build kurulabilir.

## Ekran haritası

| Tab      | Ekranlar                                 | ViewModel          |
| -------- | ---------------------------------------- | ------------------ |
| Piyasa   | MarketHome, AssetDetail, ChartFullscreen | MarketViewModel    |
| Portföy  | PortfolioHome, AddHolding, HoldingDetail | PortfolioViewModel |
| Topluluk | Feed, HashtagFilter, PostDetail          | CommunityViewModel |
| Ayarlar  | Theme, DataSource, About                 | SettingsViewModel  |

## Teknik seçimler

### Zorunlu

- Expo + TypeScript
- Provider (Context) — Redux/Zustand yok
- Atomic widgets
- Grafik: `victory-native` veya `react-native-gifted-charts`
- Yerel depolama: MMKV (tercih) veya AsyncStorage

### Bilerek ertelenen (MVP dışı)

- Auth / sosyal login
- Gerçek alım-satım / ödeme
- Kendi backend microservisleri
- Push notification kampanyaları

## Veri stratejisi

Canlı fiyat için harici sağlayıcı gerekir (Metals-API, GoldAPI, Twelve Data, TR kuyumcu feed vb.).

```ts
interface IMarketDatasource {
  fetchQuotes(): Promise<MetalQuoteDto[]>;
  fetchHistory(symbol: string, tf: Timeframe): Promise<CandleDto[]>;
  subscribe?(onTick: (q: MetalQuoteDto) => void): () => void;
}
```

- Geliştirme: `MockMarketDatasource`
- Prod: `RemoteMarketDatasource` (aynı interface)
- Repository cache’ler ve domain’e map’ler → ViewModel bilmez

Topluluk içeriği ilk dilimde **curated mock**; resmi sosyal API sonradan aynı repository arkasından bağlanır.

## Riskler

| Risk                        | Etki          | Önlem                                |
| --------------------------- | ------------- | ------------------------------------ |
| Fiyat API limiti / ücreti   | Boş piyasa    | Mock + cache + rate-limit + stale UI |
| Altın form dönüşüm hataları | Yanlış varlık | Tek purity/gram constants tablosu    |
| Topluluk telif / ToS        | Yasal risk    | Curated mock + attribution           |
| Grafik jank                 | Kötü UX       | Downsample, FlashList, throttle      |

## Definition of Done (her faz)

1. Klasör sözleşmesine uyum
2. View içinde business logic yok
3. Loading / empty / error durumları
4. Tema token’ları dışında magic number yok (padding/color)
5. TypeScript strict hatasız
6. İlgili ViewModel için en az bir unit test (Faz 4+)

## Sonraki adım

**Faz 6**'yı uygulamaya geçirmek; önce veri lisansı (aşağıdaki yol haritası).

## Yol haritası (MVP sonrası)

Yukarıdaki Faz 0–5 tamamlandı. Uygulamanın Kasım 2026 durumuna göre sonraki fazlar. Faz 6 yayın için zorunludur; diğerleri öncelik sırasındadır. Süreler tek geliştirici için kabaca tahmindir.

### Faz 6 — Yayına hazırlık (zorunlu, ~2–3 hafta)

Bunlar yapılmadan mağazaya çıkmak hukuki veya teknik risk taşır.

- **Veri lisansları (en kritik).** Binance kullanım koşulları gelir getiren uygulamalarda yazılı izin olmadan kullanımı yasaklar; Google News RSS ticari kullanım için değildir (kaldırıldı; haberler yayıncı RSS'leri ve Bluesky'dan). Fiyatlar için lisanslı bir sağlayıcı ya da lisansı alınmış verinin kendi sunucudan sunulması gerekir. Anlık fiyatlar Hasfiyat'a taşındı (sunucu ucu: `app/api/prices+api.ts`; yayın için `eas deploy`, EAS ortam değişkeni `HASFIYAT_API_KEY` ve `expo-router` `origin` ayarı gerekir); grafik geçmişi de Hasfiyat'a taşındı ve Binance tamamen kaldırıldı (anlık akış yerine 10 sn REST yenilemesi). Bu sunucu Faz 9'daki LLM özeti ve widget'ın arka plan yenilemesi için de temel olur.
- **Yasal metinler.** KVKK aydınlatma metni, gizlilik politikası, kullanım koşulları (`LEGAL_LINKS` şu an boş). Topluluk beklentisinde SPK açısından temkinli dil korunur ("Yükseliş yönlü", "Yatırım tavsiyesi değildir").
- **Abonelik.** RevenueCat paneli, App Store Connect ve Play Console'da ürünler; Apple hesabında `group.com.furkanages.altinkasam` App Group'u (widget için).
- **Kalite.** Mevcut 2 lint hatası (`set-state-in-effect`); `insightRepository`, `portfolioRepository`, `goalRepository` için birim testleri; Sentry ve temel analitik.
- **Teknik borç.**
  - `patches/expo-modules-jsi+58.0.22.patch`: Expo düzeltmeyi yayınlayınca (expo/expo#52754) kaldırılır.
  - `react-native-purchases` 10.x'te; CocoaPods trunk 2 Aralık 2026'da salt okunur olur. 11.x için Swift Package Manager geçişi planlanmalı.
- **Yayın hattı.** `eas.json` build/submit profilleri, ikon, splash ve mağaza görselleri.

### Faz 7 — Çekirdek deneyimi tamamlama (~3–4 hafta)

- **Fiyat alarmları (Pro).** "Gram altın ₺6.800'ü geçince" veya "günlük %2 düşüşte" bildirimi; push bildirim ve arka plan fiyat kontrolü.
  - ✅ İlk sürüm (10 Kasım 2026): Piyasa → altın çeşidi → "Alarm kur". Alış fiyatı hedefin üstüne/altına geçince `expo-notifications` yerel bildirimi (izin yoksa uygulama içi uyarı), bir kez tetiklenir. Ücretsizde 1 bekleyen alarm, Pro'da sınırsız (`FREE_ALARM_LIMIT`). Kontrol yalnızca uygulama açıkken çalışır.
  - Kalan: uygulama kapalıyken kontrol (sunucu + Hasfiyat `price.threshold` webhook'u ve push), yüzde değişim alarmı, gümüş için alarm, alarm listesinin Ayarlar'a taşınması.
- **Kalem düzenleme ve satış kaydı.** Şu an yalnızca ekleme/silme var; satışla gerçekleşmiş kâr/zarar ayrı gösterilir.
- **Alış tarihi.** Geçmiş tarihli alımda o günün fiyatı önerilir; portföy grafiği her kalemi alındığı günden itibaren sayar (şu an tüm dönem bugünkü kasa gösterilir).
- **Portföye gümüş.** Gümüş fiyat ve haberde var, kasaya eklenemiyor.
- **Çoklu hedef.** Dolar nakit / altın gram / gümüş gram hedefleri.

### Faz 8 — Bağlılık ve günlük alışkanlık (~3 hafta)

- **Sabah bülteni bildirimi.** Günün fiyatı, Topluluk beklentisi ve öne çıkan haber.
- **iOS Live Activity ve kilit ekranı widget'ı.** `expo-widgets` altyapısıyla.
- **Widget arka plan yenilemesi.** `expo-background-task` ile.
- **Hesap makineleri.** Ayar dönüştürücü (22 → 24 ayar gram), zekât hesaplayıcı (nisap kontrolü), "bu parayla kaç çeyrek alınır".
- **Ekonomik takvim.** Fed, TCMB ve enflasyon açıklama tarihleri; Topluluk beklentisindeki gündem konularıyla bağlantılı. **Durum (1. ve 2. aşama yapıldı):** Analiz sekmesinde son açıklananlar + yaklaşanlar, `app/calendar.tsx` (olası etki notları), açıklamadan 15 dk önce yerel hatırlatma. Takvim elle tutulmaz; sunucu resmî kaynaklardan derler (`src/server/economicCalendarSchedule.ts`: Fed FOMC sayfası, FRED `release/dates` ile BLS günleri, TCMB Takvim sayfası, TÜİK yıllık yayın listesi).
  - **Sınırlar:** FRED BLS'in yalnızca yaklaşan ilk yayınını bilir (ABD TÜFE/istihdam bir sonraki ay görünür). Hatırlatma bildirimi sonucu içermez (açıklamadan önce cihazda kurulur). Kaynak sayfalarının HTML yapısı değişirse ilgili ayrıştırıcı güncellenmeli.
  - **2. aşama (yapıldı, doğrulandı):** `app/api/calendar+api.ts` + `RemoteEconomicCalendarDatasource` (uca ulaşılamazsa paketteki liste). Ekim 2026 sonuçları resmî açıklamalarla aynı: TCMB %37→%36, Fed %3,75–4,00 sabit, ABD istihdam +165 bin, TÜİK TÜFE yıllık %29,77, ABD TÜFE aylık %0,4. Notlar: TÜİK 2026'da 2025=100 bazına geçti, EVDS serisi `TP.TUKFIY2025.GENEL` (eski `TP.FG.J0` Ocak 2026'da durdu). BLS Ekim 2025 verisini toplayamadığı için Ekim 2026 yıllık ABD TÜFE'si yayımlanmadı; uç bu durumda aylık değişimi (`CPIAUCSL`) gösterir. Plan:
  - **Beklentiler (yapıldı, izin gelene kadar kapalı):** TCMB Piyasa Katılımcıları Anketi (faiz ve aylık TÜFE) ile Cleveland Fed ABD TÜFE tahmini; ticari kullanım yazılı izne tabi olduğu için `TCMB_COMMERCIAL_PERMISSION` / `CLEVELAND_FED_PERMISSION` ile açılır; yalnızca olay detayında (BEKLENTİ bölümü ve sürpriz yorumu); takvim satırlarında gösterilmez. Ekim 2026: TCMB beklenti %36 = karar %36; TÜİK aylık %2,58, beklenti %2,11; ABD aylık %0,4, tahmin %0,2. Fed ve istihdam konsensüsü ücretli servislerde (ör. Trading Economics); eklenirse aynı alana bağlanır.
  - **2. aşama planı: uzaktan takvim + açıklanan değer.** Sunucu ucu `app/api/calendar+api.ts` (Hasfiyat ucu gibi; anahtarlar yalnızca sunucuda, `.env.local` / EAS ortam değişkeni). Takvim sunucudaki JSON'dan gelir; `IEconomicCalendarDatasource` uzak okuyan sınıfla değişir. Açıklanan değerler ücretsiz resmî kaynaklardan: FRED (Fed üst bant, ABD TÜFE endeksinden yıllık değişim, tarım dışı istihdam değişimi) ve TCMB EVDS (politika faizi, TÜİK TÜFE). Bu kaynaklar sonucu açıklamadan sonra yayımlar, birkaç saat gecikebilir. Uç yanıtı önbellekte tutulur (olay günü kısa, diğer günler uzun). Uygulamada son 7 günün olayları "Açıklandı: %2,1 · önceki %2,6" / "Faiz %36 → %35" satırıyla kalır.
  - **Karar raporları (yapıldı, Pro):** `app/economic-event/[id].tsx` + `src/server/economicReport.ts`. Fed karar metni ve TCMB faiz duyurusu sunucuda okunur (ton kuralları, oy dağılımı, paragraflar); TÜİK bülteni JavaScript gerektirdiği, BLS sunucu isteklerini engellediği için yalnızca bağlantı. Piyasa tepkisi istemcide Hasfiyat geçmişinden (24 saat). Yaklaşan takvim ve hatırlatmalar da Pro (`PaywallReason` `calendar`).
  - **3. aşama: beklenti ve sonuç bildirimi.** Beklenti (konsensüs) ücretsiz resmî kaynaklarda yok; ücretli takvim servisi gerekir (Trading Economics, FMP vb.; lisans ve fiyat karşılaştırılmalı). "Beklentinin üstünde/altında" rozeti ve sürpriz yönüne göre olası etki notu. Uygulama kapalıyken sonuç bildirimi için uzak bildirim (Expo push) ve sonucu düzenli kontrol eden zamanlanmış görev (EAS Hosting / cron). Pro özelliği olarak düşünülebilir.
  - **Ön koşul:** API uçlarının üretimde çalışması için `eas deploy` ve `expo-router` `origin` ayarı (Hasfiyat için de bekliyor).
- **Haftalık portföy raporu.**

### Faz 9 — Akıllı özellikler (~4 hafta, Faz 6 sunucusuna bağlı)

- **LLM ile haber özeti.** Kural tabanlı özetin yerine sunucuda çalışan model (API anahtarı uygulamaya gömülemez).
- **Grafikte teknik göstergeler (Pro).** Hareketli ortalama, RSI, destek/direnç.
- **Düzenli birikim planlayıcı.** "Her ay 2 gram" gibi plan; hatırlatıcı, ortalama maliyet ve hedefle bağlantı.
- **Kişisel portföy yorumu.** Ör. "Kasanın %53'ü bilezik; işçilik farkı nedeniyle satışta daha düşük fiyat alabilirsin."

### Faz 10 — Hesap ve senkronizasyon (~3 hafta)

- Apple / Google ile giriş.
- Kasa, hedef ve ayarların bulut yedeği ve cihazlar arası senkronu (şu an her şey cihazda).
- CSV / PDF dışa aktarma.
- Aile kasası: ortak hedef ve paylaşılan kasa.

### Faz 11 — Büyüme ve gelir çeşitlendirme

- Aile planı, ömür boyu paket, deneme süresi testleri.
- Arkadaşını davet et (iki tarafa Pro süresi).
- Kuyumcu entegrasyonları: yakındaki kuyumcular haritası, alış/satış makası karşılaştırması, lisans gerektirmeyen ortaklıklar.
- Çok dil: İngilizce, Almanca (yurt dışındaki Türkler), Arapça.

### 4. sekme önerisi

> Durum: 4. sekme **Analiz** olarak açıldı (Altın/Gümüş rasyosu + haftalık analiz). Aşağıdaki öneriler bu sekmeye eklenebilecek içerikler olarak geçerli.

Sekmeler 10 Kasım 2026'dan beri Piyasa (açılış) → Topluluk → Kasam (eski adıyla Portföy) sırasında. Dördüncü sekme için seçenekler, abonelik etkisine göre sıralı:

1. **İzle (önerilen).** İzleme listesi (kullanıcının seçtiği birimler; canlı fiyat, günün aralığı, mini grafik), tüm fiyat alarmları ve tek dokunuşla alarm kurma, takip edilen haber kaynakları ve isteğe bağlı sabah bülteni. Pro: sınırsız alarm, yüzde değişim alarmı, günün en düşüğü kırılımı, altın/gümüş rasyosu eşiği, sabah bülteni. Gerekçe: alarmlar altın uygulamalarında en çok ödenen özellik; şu an yalnızca çeşit detayında. Bildirimler günlük geri dönüş getirir. Uygulama kapalıyken çalışması için sunucu (Hasfiyat `price.threshold` webhook'u + push) gerekir; başlangıçta mevcut uygulama-açıkken alarmlarla çalışabilir.
2. **Birikim.** Düzenli alım planı ("her ay 2 gram"), hatırlatıcı, ortalama maliyet, hedefle bağlantı; altın günü grupları. Uzun vadeli bağlılık; Pro: çoklu plan, aylık rapor.
3. **Araçlar.** Ayar dönüştürücü, zekât hesaplayıcı, "bu parayla kaç çeyrek", enflasyona karşı getiri. Edinim ve paylaşım için iyi, dönüşüm etkisi en zayıf.

### Hasfiyat verisinden eklenebilecekler

Anlık fiyatlar Kasım 2026'da Hasfiyat'a (Harem kaynağı, `app/api/prices+api.ts` sunucu ucu üzerinden) taşındı. Harem yanıtında 38 kalem var; uygulama bunların yalnızca bir kısmını kullanıyor. Aşağıdakiler 10 Kasım 2026'daki gerçek yanıta göre çıkarıldı.

**Büyük (sunucu tarafı gerekir)**

- **Kuyumcu karşılaştırması.** Diğer kaynaklar da çalışıyor (Hakan 7, Mayda 9 kalem). Aynı birimin kuyumcular arası alış/satış farkı, "en iyi fiyat". Starter paket 2, Pro 5 kaynakla sınırlı. Faz 11'deki kuyumcu entegrasyonuyla birleşir.
- **Fiyat alarmları.** Hasfiyat `price.threshold` webhook'u → sunucu → push bildirimi; Faz 7'deki Pro alarmların altyapısı.
- **Gerçek zamanlı yerel akış.** Hasfiyat WebSocket'i (`wss://api.hasfiyat.com/stream?source=harem`) 10 sn REST yenilemesinin yerini alabilir. Starter'da 1 eşzamanlı bağlantı olduğu için sunucu tek bağlantıyı tutup uygulamalara dağıtmalı; EAS Hosting uzun süreli bağlantıyı muhtemelen desteklemez, ayrı sunucu gerekebilir.

### Öncelik

1. Faz 6'daki veri lisansı — yeni özellikten önce çözülmesi gereken tek iş.
2. Faz 7'den fiyat alarmları ve alış tarihi — Pro'ya dönüşümü en çok bu ikisi artırır.
