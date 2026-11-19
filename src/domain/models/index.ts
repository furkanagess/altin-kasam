import type { ChartUnit, Currency, Timeframe } from "@/src/core/constants/app";
import type { BrentSymbol, CommunityPostKind, MetalSymbol } from "@/src/domain/enums";

export type QuoteSource = "live" | "simulated";

/** Fiyatın geldiği API; simüle veride yoktur. */
export type DataProvider = "hasfiyat";

/** Alış fiyatının günlük istatistiği (fiyatla aynı para birimi). */
export type DayRange = {
  open: number;
  high: number;
  low: number;
  previousClose: number;
};

export type MetalQuote = {
  symbol: MetalSymbol;
  name: string;
  /** Para birimi olmadan birim: `g`, `kg`, `varil`. */
  unit: string;
  bid: number;
  ask: number;
  changePercent: number;
  currency: Currency;
  timestamp: number;
  source: QuoteSource;
  provider?: DataProvider;
  day?: DayRange;
};

/** 1 birim yabancı paranın TRY karşılığı (`TRY` her zaman 1). */
export type FxRates = Partial<Record<Currency, number>>;

/** Portföy varlığı (`GOLD_ASSETS` id) için piyasada işlem gören adet fiyatı. */
export type GoldRate = {
  assetId: string;
  bid: number;
  ask: number;
  changePercent: number;
  timestamp: number;
  provider?: DataProvider;
  day?: DayRange;
};

export type MarketQuotes = {
  quotes: MetalQuote[];
  /** Ons fiyatları (USD/ons, uluslararası spot); `symbol` gram fiyatıyla aynı metaldir. */
  ounceQuotes?: MetalQuote[];
  goldRates: GoldRate[];
  fxRates: FxRates;
  /** Ons altın / ons gümüş; kaynak vermezse yok. */
  goldSilverRatio?: number;
  /** Piyasa özet şeridi (ONS, kurlar, ayarlar); kaynak vermezse uygulama fiyatlarından kurulur. */
  ticker?: TickerItem[];
};

/** Özet şeridindeki tek kalem; alış fiyatı (uygulamanın geri kalanıyla aynı). */
export type TickerItem = {
  id: string;
  label: string;
  value: number;
  /** `value` para birimi (ONS dolar, diğerleri TL). */
  currency: "TRY" | "USD";
  /** Günlük değişim (%); bilinmiyorsa ok gösterilmez. */
  changePercent: number | null;
};

export type CandlePoint = {
  t: number;
  v: number;
};

export type MarketSnapshot = MarketQuotes & {
  updatedAt: number;
  stale: boolean;
};

export type ChartSeries = {
  symbol: MetalSymbol | BrentSymbol;
  timeframe: Timeframe;
  currency: Currency;
  /** Verilmezse gram. */
  unit?: ChartUnit;
  points: CandlePoint[];
};

export type AnalysisOutlook = "up" | "down" | "neutral";

export type EconomicEventKind = "rate" | "inflation" | "jobs";

/** Altın ve gümüşü etkileyen makro veri açıklaması ya da faiz kararı. */
export type EconomicEvent = {
  id: string;
  /** Açıklama anı, saat dilimiyle (ör. "2026-12-10T14:00:00+03:00"). */
  at: string;
  country: "US" | "TR";
  kind: EconomicEventKind;
  title: string;
  /** Verinin ait olduğu dönem, ör. "Kasım verisi". */
  period?: string;
  /** Veri açıklamalarında verinin ait olduğu ay ("2026-10"); açıklanan değer bununla bulunur. */
  ref?: string;
  /** Açıklanan değer ya da karar; yalnızca geçmiş olaylarda ve kaynak yayımladıysa. */
  result?: EconomicEventResult;
  /** Kurumun kendi duyuru/bülten sayfası, takvimden biliniyorsa (ör. TÜİK bülteni). */
  sourceUrl?: string;
  /** Kaynaklarda varsa piyasa beklentisi ya da model tahmini. */
  expectation?: EconomicEventExpectation;
};

export type EconomicEventExpectation = {
  /** Sonuçla aynı biçimde, ör. "%35,00", "%2,11". */
  value: string;
  /** Faiz kararında yok; veride "Aylık" ya da "Yıllık". */
  basis?: "Aylık" | "Yıllık";
  /** Ör. "TCMB Piyasa Katılımcıları Anketi (Ekim 2026)". */
  source: string;
  /** Anket ortalaması ya da model tahmini (Cleveland Fed). */
  kind: "survey" | "nowcast";
  /** Açıklanan değerin beklentiye göre konumu; yalnızca açıklanmış olaylarda. */
  surprise?: "above" | "below" | "inline";
  /** Beklentiyle aynı ölçüde açıklanan değer, sonuç başka ölçüdeyse (TR TÜFE'de aylık). */
  actual?: string;
};

export type EconomicEventResult = {
  /** Ör. "%29,77", "+120 bin", "%3,50–3,75". */
  value: string;
  previous?: string;
  /** Ör. "Yıllık", "100 bp indirim", "Sabit". */
  detail?: string;
  /** Önceki değere göre yön; renk için. */
  direction?: "up" | "down" | "flat";
  /** Aylık değişim (ör. "%2,58"); yıllık oran açıklanan verilerde beklentiyle karşılaştırma için. */
  monthly?: string;
};

/** Geliştiricinin her hafta yayımladığı piyasa analizi. */
/**
 * Haftalık analiz şablonu: 1) tek cümlelik özet, 2) haftalık beklenti + takip seviyeleri,
 * 3) serbest başlık/yorum bölümleri. Firestore `weeklyAnalyses/{id}` belgesiyle birebir aynıdır.
 */
export type WeeklyAnalysis = {
  id: string;
  /** Haftanın ilk günü (pazartesi), YYYY-MM-DD. */
  weekStart: string;
  /** Tek cümlelik özet; kartta ve detay başında gösterilir. */
  summary: string;
  publishedAt: string;
  /** Metal başına haftalık beklenti. */
  outlook: {
    metal: "gold" | "silver";
    direction: AnalysisOutlook;
    note?: string;
  }[];
  /** Birim başına takip edilen seviyeler; destek/direnç yoksa tek değer (`value`). */
  levels: { label: string; support?: string; resistance?: string; value?: string }[];
  /** Geri kalan bölümler: başlık + yorum. */
  sections: { title: string; comment: string }[];
};

/** Bir altın çeşidinin alış fiyatı hedefe ulaşınca bir kez bildirim gönderen alarm. */
export type PriceAlarm = {
  id: string;
  /** `GOLD_ASSETS` id. */
  assetId: string;
  /** `above`: alış fiyatı hedefin üstüne çıkınca; `below`: altına inince. */
  direction: "above" | "below";
  /** TRY cinsinden alış fiyatı. */
  target: number;
  /** Kullanıcının alarma eklediği kısa not (isteğe bağlı); bildirimde de gösterilir. */
  note?: string;
  createdAt: string;
  /** Tetiklenince dolar; tetiklenmiş alarm bir daha bildirim göndermez. */
  triggeredAt?: string;
  /** Kullanıcı tetiklenen alarmı alarm ekranında gördüğünde dolar; dolana kadar ikonda rozet çıkar. */
  seenAt?: string;
};

export type Holding = {
  id: string;
  assetId: string;
  quantity: number;
  costBasisPerUnit: number;
  boughtAt: string;
  note?: string;
};

export type ValuedHolding = Holding & {
  label: string;
  unitPrice: number;
  marketValue: number;
  costTotal: number;
  pnl: number;
  pnlPercent: number;
};

/** Aynı birimin tüm alımları tek pozisyonda: ortalama maliyet ve toplam kâr/zarar. */
export type PortfolioPosition = {
  assetId: string;
  label: string;
  quantity: number;
  /** Ağırlıklı ortalama birim maliyet: toplam maliyet / toplam miktar. */
  averageCost: number;
  unitPrice: number;
  marketValue: number;
  costTotal: number;
  pnl: number;
  pnlPercent: number;
  firstBoughtAt: string;
  /** Alımlar, yeniden eskiye. */
  holdings: ValuedHolding[];
};

export type PortfolioSnapshot = {
  holdings: ValuedHolding[];
  /** Birim başına birleşik pozisyonlar, değere göre büyükten küçüğe. */
  positions: PortfolioPosition[];
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
  /** Dünkü kapanışa göre bugünkü kâr/zarar; bugün alınan kalemler alış fiyatına göre sayılır. */
  dayPnl: number;
  dayPnlPercent: number;
  currency: Currency;
};

export type PortfolioBreakdown = {
  /**
   * Gram / ziynet / bilezik / metal / nakit; boş türler yer almaz. `share` 0…1. `quantity`
   * `unit` cinsinden toplamdır; nakitte para birimleri karışık olduğu için `unit` yoktur.
   */
  groups: {
    id: string;
    label: string;
    value: number;
    share: number;
    quantity: number;
    unit: "gram" | "adet" | null;
    /**
     * Karışık birimli gruplarda (nakit, metaller) varlık başına kırılım; tek varlık varsa da
     * verilir. `amount` kendi biriminde biçimlendirilmiş miktardır ("1.000 $", "100 g").
     */
    items?: {
      id: string;
      label: string;
      value: number;
      share: number;
      amount: string;
    }[];
    /**
     * Nakit ve metalde yalnızca tek tür varsa alt kırılım yerine satırda gösterilen özet
     * ("1.000 $", "Gümüş 100 g"). Kırılım en az 2 farklı tür olunca `items` ile verilir.
     */
    summary?: string;
  }[];
  /** Toplam 24 ayar gram altın karşılığı. */
  pureGrams: number;
};

export type GoalPeriod = "monthly" | "yearly";

/** Dönem başına kasaya eklenmesi hedeflenen altın (24 ayar gram karşılığı). */
export type InvestmentGoal = {
  period: GoalPeriod;
  grams: number;
  createdAt: string;
};

/** Miktarlar 24 ayar gram karşılığı; `spent` TRY. */
export type GoalProgress = {
  goal: InvestmentGoal;
  periodStart: number;
  periodEnd: number;
  /** Dönem içinde kasaya eklenen altın. */
  gramsAdded: number;
  /** Dönemin geçen kısmına göre bu ana kadar eklenmiş olması beklenen gram. */
  expectedGrams: number;
  remainingGrams: number;
  ratio: number;
  daysLeft: number;
  purchases: number;
  /** Dönem alımlarının toplam maliyeti. */
  spent: number;
};

export type GoalProgressView = GoalProgress & {
  /** `currency` cinsinden; kalan gramın bugünkü satış fiyatıyla tahmini maliyeti dahil. */
  display: { spent: number; remainingCost: number | null };
  currency: Currency;
};

export type SentimentLabel =
  | "positive"
  | "negative"
  | "neutral"
  | "insufficient";

/** Haber tonundan türetilen yükseliş/düşüş göstergesi; `none` yetersiz veri demektir. */
export type TradeSignal =
  | "strongSell"
  | "sell"
  | "hold"
  | "buy"
  | "strongBuy"
  | "none";

/** Günün haber ve gönderilerinden çıkarılan ton; fiyat tahmini değildir. */
export type MetalInsight = {
  topic: "gold" | "silver";
  label: SentimentLabel;
  /** -1 (tamamen olumsuz) … 1 (tamamen olumlu). */
  score: number;
  signal: TradeSignal;
  counts: { positive: number; negative: number; neutral: number };
  analyzed: number;
  /** TRY; piyasa verisi varsa. */
  price?: number;
  priceChangePercent?: number;
  topics: string[];
  topPositive: CommunityPost[];
  topNegative: CommunityPost[];
  summary: string;
};

export type SubscriptionPeriod = "monthly" | "annual" | "lifetime" | "other";

/** Mağaza ürünü; SDK nesnesi data katmanında kalır, burada yalnızca gösterim bilgisi var. */
export type SubscriptionPackage = {
  id: string;
  title: string;
  priceString: string;
  /** Mağaza para biriminde; paketler arası tasarruf hesabı için. */
  price: number;
  period: SubscriptionPeriod;
  /** Ör. "7 gün ücretsiz"; deneme yoksa boş. */
  trial?: string;
  /** RevenueCat offering kimliği; fiyat deneylerinde hangi grubun gösterildiğini ölçmek için. */
  offeringId?: string;
};

export type CommunityPost = {
  id: string;
  kind: CommunityPostKind;
  title?: string;
  body: string;
  author: string;
  hashtags: string[];
  source: string;
  publishedAt: string;
  /** Haberlerde beğeni bilgisi yoktur. */
  likes?: number;
  /** Orijinal içerik; atıf ve "kaynağında aç" için. */
  url?: string;
};

/**
 * Ana ekran widget'ına gönderilen veri. Widget izole bir çalışma ortamında çizildiği için
 * değerler uygulamada biçimlendirilmiş metin olarak gelir.
 */
export type HomeWidgetProps = {
  /** Henüz fiyat gönderilmediyse (ilk kurulum) fiyat yerine "uygulamayı aç" mesajı gösterilir. */
  locked: boolean;
  /**
   * Ücretsiz plan: yalnızca küçük boy gram altın widget'ı fiyat gösterir; orta boy (iOS) Pro
   * tanıtımı gösterir. Eski sürümden kalan veride bulunmayabilir.
   */
  free?: boolean;
  metal: "gold" | "silver";
  /** Kısa ad, büyük harfle, ör. "GRAM ALTIN". */
  title: string;
  /** Ayar ve fiyat türü, ör. "24 ayar · Alış". */
  subtitle: string;
  price: string;
  /** Yön oku ile yüzde, ör. "▲ 1,08%". */
  change: string;
  up: boolean;
  /** Ör. "14:05"; widget yalnızca uygulama veri gönderdiğinde değişir. */
  updatedAt: string;
  /** Widget'a dokununca açılan derin bağlantı. */
  url: string;
};
