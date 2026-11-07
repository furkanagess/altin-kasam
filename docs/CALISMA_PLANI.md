# Altın Kasam — Çalışma Planı

Senior React Native seviyesinde **MVVM + Provider + Atomic Design** ile mobil uygulama planı.
Fazlar teslimat ve bağımlılığa göre ayrılmıştır; takvim tahmini yoktur.

## Ürün özeti

| Yüzey | Ne sağlar |
| --- | --- |
| **Piyasa** | Altın (14/18/22/24 ayar, çeyrek/yarım/tam/reşat/gram), gümüş, bakır, petrol, platin — canlı fiyat + grafik |
| **Portföy** | Sanal varlık ekleme; canlı fiyattan net varlık ve P&L takibi |
| **Topluluk** | `#Altın`, `#XAUUSD` vb. hashtag’lerle tweet / blog / yazı feed’i |

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

| Form | Tipik gram (örnek) | Karat seçenekleri |
| --- | --- | --- |
| Gram | 1 | 14 / 18 / 22 / 24 |
| Çeyrek | ~1.75 | 22 (standart) |
| Yarım | ~3.5 | 22 |
| Tam | ~7 | 22 |
| Reşat / Cumhuriyet | standart ağırlık | 22 |

Purity tablosu ViewModel’de hardcode edilmez; constant’tan okunur.

### Ana modeller

- `MetalQuote` — `symbol`, `bid`, `ask`, `changePercent`, `currency`, `timestamp`
- `GoldAsset` — `id`, `karat`, `form`, `purity`, `gramWeight`
- `Holding` — `id`, `assetId`, `quantity`, `costBasis`, `boughtAt`, `note?`
- `PortfolioSnapshot` — `totalValue`, `totalCost`, `pnl`, `pnlPercent`, `series[]`
- `CommunityPost` — `id`, `kind: tweet|blog|article`, `title?`, `body`, `hashtags[]`, `source`, `publishedAt`

## State management (Provider)

Her feature kendi Context + Provider çifti:

| Provider | Sorumluluk |
| --- | --- |
| `MarketProvider` | quotes, selectedAsset, timeframe, refresh, stale |
| `PortfolioProvider` | holdings CRUD, valuation, history series |
| `CommunityProvider` | feed, hashtag filter, pagination |
| `SettingsProvider` | tema, datasource mode (mock/live), dil |

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

| Tab | Ekranlar | ViewModel |
| --- | --- | --- |
| Piyasa | MarketHome, AssetDetail, ChartFullscreen | MarketViewModel |
| Portföy | PortfolioHome, AddHolding, HoldingDetail | PortfolioViewModel |
| Topluluk | Feed, HashtagFilter, PostDetail | CommunityViewModel |
| Ayarlar | Theme, DataSource, About | SettingsViewModel |

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

| Risk | Etki | Önlem |
| --- | --- | --- |
| Fiyat API limiti / ücreti | Boş piyasa | Mock + cache + rate-limit + stale UI |
| Altın form dönüşüm hataları | Yanlış varlık | Tek purity/gram constants tablosu |
| Topluluk telif / ToS | Yasal risk | Curated mock + attribution |
| Grafik jank | Kötü UX | Downsample, FlashList, throttle |

## Definition of Done (her faz)

1. Klasör sözleşmesine uyum
2. View içinde business logic yok
3. Loading / empty / error durumları
4. Tema token’ları dışında magic number yok (padding/color)
5. TypeScript strict hatasız
6. İlgili ViewModel için en az bir unit test (Faz 4+)

## Sonraki adım

**Faz 0**’ı uygulamaya geçirmek: Expo scaffold + klasör iskeleti + tema + tab navigasyon + Provider şablonu.
