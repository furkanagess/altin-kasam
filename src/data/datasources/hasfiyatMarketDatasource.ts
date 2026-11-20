import { Platform } from 'react-native';
import { POLL_INTERVAL_MS, type ChartUnit, type Currency, type Timeframe } from '@/src/core/constants/app';
import type { HasfiyatItem, HasfiyatPricesResponse } from '@/src/data/datasources/hasfiyatTypes';
import { usdPerOunceToTryPerGram } from '@/src/utils/metal';
import { fetchJson } from '@/src/data/datasources/http';
import { isNetworkError } from '@/src/core/network/networkErrors';
import { networkMonitor } from '@/src/core/network/networkMonitor';
import type { IMarketDatasource } from '@/src/data/datasources/marketDatasource';
import { ChartHistoryDatasource } from '@/src/data/datasources/chartHistoryDatasource';
import { GOLD_RATES, GRAM_GOLD_TITLES, normalizeTitle } from '@/src/core/constants/hasfiyatPriceMap';
import { MetalSymbol } from '@/src/domain/enums';
import type {
  CandlePoint,
  DayRange,
  FxRates,
  GoldRate,
  MarketQuotes,
  MetalQuote,
  TickerItem,
} from '@/src/domain/models';

/** Uygulamanın kendi sunucu ucu; geliştirmede Metro'ya, üretimde `expo-router` `origin` adresine gider. */
const ENDPOINT = '/api/prices';
/** Anahtar tanımlı değilse ya da uç yoksa bir süre istek atılmaz; son fiyat eski veri olarak kalır. */
const UNAVAILABLE_BACKOFF_MS = 5 * 60_000;

const METALS = [
  { symbol: MetalSymbol.XAU, name: 'Gram Altın (24)', unit: 'g', titles: GRAM_GOLD_TITLES },
  { symbol: MetalSymbol.XAG, name: 'Gümüş', unit: 'g', titles: ['GÜMÜŞ TL'] },
] as const;

const FX = { USD: ['USD/TL'], EUR: ['EUR/TL'] } as const;

/**
 * Ons fiyatından (USD) gram TL'ye çevrilen metaller. Kuyumcu "USD" kalemleri (~%10 makaslı)
 * yerine ons kullanılır: grafik geçmişi de ons bazlıdır, son nokta seviyeyle örtüşür.
 */
const OUNCE_METALS = [
  { symbol: MetalSymbol.XPT, name: 'Gram Platin', titles: ['PLATİN ONS'] },
  { symbol: MetalSymbol.XPD, name: 'Gram Paladyum', titles: ['PALADYUM ONS'] },
] as const;

/** Ons görünümü: uluslararası spot, USD/ons; Hasfiyat'ın doğrudan ons kalemleri. */
const OUNCE_QUOTES = [
  { symbol: MetalSymbol.XAU, name: 'Ons Altın', titles: ['ONS'] },
  { symbol: MetalSymbol.XAG, name: 'Ons Gümüş', titles: ['GÜMÜŞ ONS'] },
  { symbol: MetalSymbol.XPT, name: 'Ons Platin', titles: ['PLATİN ONS'] },
  { symbol: MetalSymbol.XPD, name: 'Ons Paladyum', titles: ['PALADYUM ONS'] },
] as const;

const RATIO_TITLES = ['ALTIN/GÜMÜŞ'];

/** Özet şeridi, kuyumcu panolarındaki sırayla. */
const TICKER: { id: string; label: string; titles: readonly string[]; currency: TickerItem['currency'] }[] = [
  { id: 'ons', label: 'ONS', titles: ['ONS'], currency: 'USD' },
  { id: 'usd', label: 'USD', titles: ['USD/TL'], currency: 'TRY' },
  { id: 'eur', label: 'EUR', titles: ['EUR/TL'], currency: 'TRY' },
  { id: 'gram', label: 'GRAM', titles: GRAM_GOLD_TITLES, currency: 'TRY' },
  { id: '22ayar', label: '22 AYAR', titles: ['22 AYAR'], currency: 'TRY' },
  { id: '14ayar', label: '14 AYAR', titles: ['14 AYAR'], currency: 'TRY' },
  { id: 'ceyrek', label: 'ÇEYREK', titles: ['YENİ ÇEYREK'], currency: 'TRY' },
  { id: 'gumus', label: 'GÜMÜŞ', titles: ['GÜMÜŞ TL'], currency: 'TRY' },
  { id: 'usdkg', label: 'USD/KG', titles: ['USD/KG'], currency: 'TRY' },
];

function scaleDay(day: HasfiyatItem['day'], units: number): DayRange | undefined {
  if (!day) return undefined;
  return {
    open: day.open * units,
    high: day.high * units,
    low: day.low * units,
    previousClose: day.previousClose * units,
  };
}

class UnavailableError extends Error {}

/**
 * Web'de aynı tarayıcının açık sekmeleri son fiyat yanıtını `localStorage` üzerinden paylaşır:
 * bir sekme yeni çektiyse diğerleri yoklama aralığı içinde ağa gitmez. N sekme ≈ 1 sekme trafiği.
 */
const SHARED_KEY = 'altinkasam:prices:v1';
/** Paylaşılan yanıt bu süreden tazeyse kullanılır; yoklama aralığından biraz kısa (sekmeler kaymasın). */
const SHARED_FRESH_MS = POLL_INTERVAL_MS - 2_000;

function webStorage(): Storage | null {
  if (Platform.OS !== 'web') return null;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readShared(now = Date.now()): HasfiyatPricesResponse | null {
  try {
    const raw = webStorage()?.getItem(SHARED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; body?: HasfiyatPricesResponse };
    if (typeof parsed.at !== 'number' || now - parsed.at >= SHARED_FRESH_MS || now < parsed.at) return null;
    return parsed.body?.items?.length ? parsed.body : null;
  } catch {
    return null;
  }
}

function writeShared(body: HasfiyatPricesResponse) {
  try {
    webStorage()?.setItem(SHARED_KEY, JSON.stringify({ at: Date.now(), body }));
  } catch {
    // Depolama kapalı ya da dolu: sekme kendi isteğiyle devam eder.
  }
}

/**
 * Fiyatların tek kaynağı Hasfiyat'tır (Harem; lisanslı API, anahtar sunucuda). Yedek fiyat kaynağı
 * yoktur: ulaşılamazsa hata döner ve depo son fiyatı "eski veri" olarak gösterir. Grafik geçmişi
 * `ChartHistoryDatasource`'tan gelir ve Hasfiyat fiyat seviyesine hizalanır.
 */
export class HasfiyatMarketDatasource implements IMarketDatasource {
  private unavailableUntil = 0;
  /** Elle yenileme ile yoklama çakışırsa tek istek atılır. */
  private inflight: Promise<HasfiyatPricesResponse> | null = null;

  constructor(private readonly chartHistory = new ChartHistoryDatasource()) {}

  async fetchQuotes(): Promise<MarketQuotes> {
    const primary = await this.fetchPrimary();

    const byTitle = new Map(primary.items.map((item) => [normalizeTitle(item.title), item]));
    const find = (titles: readonly string[]): HasfiyatItem | undefined =>
      titles.map((t) => byTitle.get(normalizeTitle(t))).find(Boolean);
    const parsedUpdate = primary.lastUpdate ? Date.parse(primary.lastUpdate) : NaN;
    const timestamp = Number.isFinite(parsedUpdate) ? parsedUpdate : Date.now();

    const quotes: MetalQuote[] = [];
    for (const metal of METALS) {
      const item = find(metal.titles);
      if (!item) continue;
      quotes.push({
        symbol: metal.symbol,
        name: metal.name,
        unit: metal.unit,
        bid: item.bid,
        ask: item.ask,
        changePercent: item.changePercent ?? NaN,
        currency: 'TRY',
        timestamp,
        source: 'live',
        provider: 'hasfiyat',
        day: scaleDay(item.day, 1),
      });
    }

    const goldRates: GoldRate[] = [];
    for (const [assetId, { titles, units }] of Object.entries(GOLD_RATES)) {
      const item = find(titles);
      if (!item) continue;
      goldRates.push({
        assetId,
        bid: item.bid * units,
        ask: item.ask * units,
        changePercent: item.changePercent ?? NaN,
        timestamp,
        provider: 'hasfiyat',
        day: scaleDay(item.day, units),
      });
    }

    const fxRates: FxRates = { TRY: 1 };
    for (const [currency, titles] of Object.entries(FX) as [keyof typeof FX, readonly string[]][]) {
      const item = find(titles);
      if (item) fxRates[currency] = (item.bid + item.ask) / 2;
    }

    if (!quotes.length) throw new Error('Hasfiyat altın ve gümüş fiyatı döndürmedi');
    // Günlük değişimi olmayan kalemde ok gösterilmez (0).
    const withChange = <T extends { changePercent: number }>(item: T): T =>
      Number.isNaN(item.changePercent) ? { ...item, changePercent: 0 } : item;
    const base = { quotes: quotes.map(withChange), goldRates: goldRates.map(withChange), fxRates };

    const usdTry = base.fxRates.USD;
    const ounceQuotes: MetalQuote[] = usdTry
      ? OUNCE_METALS.flatMap((metal) => {
          const item = find(metal.titles);
          if (!item) return [];
          const perGram = (usd: number) => usdPerOunceToTryPerGram(usd, usdTry);
          return [
            {
              symbol: metal.symbol,
              name: metal.name,
              unit: 'g',
              bid: perGram(item.bid),
              ask: perGram(item.ask),
              changePercent: item.changePercent ?? 0,
              currency: 'TRY',
              timestamp,
              source: 'live',
              provider: 'hasfiyat',
              day: item.day
                ? {
                    open: perGram(item.day.open),
                    high: perGram(item.day.high),
                    low: perGram(item.day.low),
                    previousClose: perGram(item.day.previousClose),
                  }
                : undefined,
            },
          ];
        })
      : [];
    const merged = { ...base, quotes: [...base.quotes, ...ounceQuotes] };

    const spotOunce: MetalQuote[] = OUNCE_QUOTES.flatMap((metal) => {
      const item = find(metal.titles);
      if (!item) return [];
      return [
        {
          symbol: metal.symbol,
          name: metal.name,
          unit: 'ons',
          bid: item.bid,
          ask: item.ask,
          changePercent: item.changePercent ?? 0,
          currency: 'USD' as const,
          timestamp,
          source: 'live' as const,
          provider: 'hasfiyat' as const,
          day: scaleDay(item.day, 1),
        },
      ];
    });

    await this.chartHistory.remember(merged.quotes, merged.fxRates, spotOunce);
    const ratio = find(RATIO_TITLES);
    const ticker = TICKER.flatMap(({ id, label, titles, currency }) => {
      const item = find(titles);
      // Alış: grafik, liste ve kasa da alış fiyatıyla; gümüşte satış ~%8 yüksek, karışıklık yaratır.
      return item ? [{ id, label, value: item.bid, currency, changePercent: item.changePercent }] : [];
    });
    return {
      ...merged,
      ounceQuotes: spotOunce.length ? spotOunce : undefined,
      goldSilverRatio: ratio ? (ratio.bid + ratio.ask) / 2 : undefined,
      ticker: ticker.length ? ticker : undefined,
    };
  }

  fetchHistory(symbol: MetalSymbol, timeframe: Timeframe, currency: Currency, unit?: ChartUnit): Promise<CandlePoint[]> {
    return this.chartHistory.fetchHistory(symbol, timeframe, currency, unit);
  }

  private fetchPrimary(): Promise<HasfiyatPricesResponse> {
    const shared = readShared();
    if (shared) return Promise.resolve(shared);
    this.inflight ??= this.requestPrimary().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async requestPrimary(): Promise<HasfiyatPricesResponse> {
    if (Date.now() < this.unavailableUntil) throw new UnavailableError('Hasfiyat geçici olarak devre dışı');
    try {
      const response = await fetchJson<HasfiyatPricesResponse>(ENDPOINT);
      if (!response.items?.length) throw new Error('Hasfiyat boş yanıt döndürdü');
      writeShared(response);
      return response;
    } catch (e) {
      // 503: anahtar tanımlı değil; 404/ağ hatası: sunucu ucu yok (ör. üretimde `origin` ayarlanmamış).
      // Çevrimdışı, zaman aşımı ya da zayıf bağlantıdaki kopmalar uç yokluğu sayılmaz; aksi halde
      // bağlantı geri gelse bile birincil kaynak 5 dakika boyunca kullanılmazdı.
      const endpointMissing =
        isNetworkError(e) &&
        ((e.kind === 'http' && (e.status === 503 || e.status === 404)) ||
          (e.kind === 'network' && !networkMonitor.isWeak()));
      if (endpointMissing) this.unavailableUntil = Date.now() + UNAVAILABLE_BACKOFF_MS;
      throw e;
    }
  }
}
