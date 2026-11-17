import {
  CURRENCIES,
  CHART_REFRESH_MS,
  POLL_INTERVAL_CLOSED_MS,
  POLL_INTERVAL_MS,
  TIMEFRAMES,
  type ChartUnit,
  type Currency,
  type Timeframe,
} from '@/src/core/constants/app';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import { userMessageForError } from '@/src/core/network/networkErrors';
import { networkMonitor } from '@/src/core/network/networkMonitor';
import { useNetworkRecovery } from '@/src/viewmodels/network/useNetworkStatus';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { BRENT, MetalSymbol } from '@/src/domain/enums';
import type {
  ChartSeries,
  DayRange,
  FxRates,
  GoldRate,
  MarketSnapshot,
  MetalQuote,
} from '@/src/domain/models';
import { FREE_CURRENCIES, FREE_TIMEFRAMES } from '@/src/core/constants/premium';
import { fromTry, resolveCurrency } from '@/src/utils/currency';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isMarketClosed } from '@/src/utils/marketHours';
import { AppState } from 'react-native';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type MarketContextValue = {
  state: LoadState;
  error: string | null;
  snapshot: MarketSnapshot | null;
  /** TRY cinsinden; hesaplama (portföy değerleme) için. */
  quotes: MetalQuote[];
  /** Gösterim para birimine çevrilmiş fiyatlar. */
  displayQuotes: MetalQuote[];
  /** `currency` cinsinden ons fiyatları (uluslararası spot); kaynak vermezse boş. */
  displayOunceQuotes: MetalQuote[];
  /** TRY cinsinden altın çeşidi fiyatları (portföy değerleme). */
  goldRates: GoldRate[];
  /** `currency` cinsinden altın çeşidi fiyatları. */
  displayGoldRates: GoldRate[];
  fxRates: FxRates;
  /** Gösterim para birimi; kur henüz yoksa seçime rağmen TRY. */
  currency: Currency;
  currencies: readonly Currency[];
  /** Pro gerektiren seçenekler; arayüz bunlara dokununca ödeme ekranını açar. */
  lockedCurrencies: readonly Currency[];
  lockedTimeframes: readonly Timeframe[];
  setCurrency: (currency: Currency) => void;
  refresh: () => Promise<void>;
  timeframes: readonly Timeframe[];
};

/** Metal grafikleri: gram/ons fiyatı, kasa ve alarm bunlara bağlıdır. */
export const METAL_CHART_SYMBOLS = [MetalSymbol.XAU, MetalSymbol.XAG] as const;
export type MetalChartSymbol = (typeof METAL_CHART_SYMBOLS)[number];
/** Grafiği gösterilen varlıklar (altın, gümüş, Brent petrol); hepsinin serisi birlikte yüklenir, aralarında geçiş anlıktır. */
export const CHART_SYMBOLS = [...METAL_CHART_SYMBOLS, BRENT] as const;
export type ChartSymbol = (typeof CHART_SYMBOLS)[number];
type ChartMap = Partial<Record<ChartSymbol, ChartSeries>>;

/**
 * Yüklenen bütün seriler seçim anahtarıyla (metal, birim, periyot, para birimi) saklanır: gram ⇄ ons
 * ve periyot geçişlerinde daha önce çekilen seri anında gösterilir, yeniden yükleme beklenmez.
 * `latest`, o metal ve birim için en son gelen seridir; yeni seçimin serisi gelene kadar (yükleniyor
 * göstergesiyle) ekranda kalır, grafik boşalmaz.
 */
type ChartStore = {
  byKey: Record<string, ChartSeries>;
  latest: Record<string, ChartSeries>;
};
const EMPTY_STORE: ChartStore = { byKey: {}, latest: {} };
/** Brent'in serisi birimden bağımsızdır; ons gibi saklanır ve USD ana birimdir. */
const seriesParams = (symbol: ChartSymbol, unit: ChartUnit, chartCurrency: Currency, brentCurrency: Currency) =>
  symbol === BRENT ? { unit: 'ounce' as const, currency: brentCurrency } : { unit, currency: chartCurrency };
const seriesKey = (symbol: ChartSymbol, unit: ChartUnit, tf: Timeframe, currency: Currency) =>
  `${symbol}|${unit}|${tf}|${currency}`;

/**
 * Grafik durumu fiyatlardan ayrı tutulur: periyot değişince yalnızca grafiği
 * okuyan bileşenler yeniden çizilir; fiyat satırları, portföy ve widget etkilenmez.
 */
type MarketChartContextValue = {
  timeframe: Timeframe;
  /** Grafiğin birimi: gram (TL/g) ya da ons (uluslararası spot). Tüm metaller için ortaktır. */
  unit: ChartUnit;
  setUnit: (unit: ChartUnit) => void;
  /**
   * Grafiğin ve üstündeki fiyatın para birimi. Gramda genel `currency`; onsta ayrı bir seçimdir ve
   * varsayılanı USD'dir (ons dolar cinsinden işlem görür). Portföy ve diğer ekranlar etkilenmez.
   */
  chartCurrency: Currency;
  /** Grafik para birimi seçicisinde Pro gerektiren seçenekler (onsta USD ücretsizdir). */
  lockedChartCurrencies: readonly Currency[];
  setChartCurrency: (currency: Currency) => void;
  /**
   * Brent petrol grafiğinin para birimi. Brent'te gram/ons ayrımı yoktur ve ons gibi USD ana
   * birimdir; seçim onsla ortaktır, gram/ons geçişinden etkilenmez.
   */
  brentCurrency: Currency;
  lockedBrentCurrencies: readonly Currency[];
  setBrentCurrency: (currency: Currency) => void;
  /**
   * Her zaman `currency` cinsinden. Para birimi aynıysa sembolün seri referansı yalnızca o
   * sembolün yeni verisi gelince değişir; memo'lu grafikler diğer sembolün yüklemesinde çizilmez.
   */
  charts: ChartMap;
  /** Seri yok ya da periyot/para birimi henüz yeni seçime uymuyor. */
  chartLoading: Record<ChartSymbol, boolean>;
  setTimeframe: (tf: Timeframe) => void;
};

const MarketContext = createContext<MarketContextValue | null>(null);
const MarketChartContext = createContext<MarketChartContextValue | null>(null);

const EMPTY_QUOTES: MetalQuote[] = [];
const EMPTY_GOLD_RATES: GoldRate[] = [];
const EMPTY_FX_RATES: FxRates = { TRY: 1 };
const NO_TIMEFRAMES: readonly Timeframe[] = [];
const NO_CURRENCIES: readonly Currency[] = [];
/** Onsta ücretsiz para birimleri: USD ana birimdir, TRY de açık kalır. */
const FREE_OUNCE_CURRENCIES: readonly Currency[] = ['USD', 'TRY'];
const CURRENCY_STORAGE_KEY = 'altin_kasam_currency_v1';

function convertDay(day: DayRange | undefined, currency: Currency, fxRates: FxRates): DayRange | undefined {
  if (!day) return undefined;
  return {
    open: fromTry(day.open, currency, fxRates),
    high: fromTry(day.high, currency, fxRates),
    low: fromTry(day.low, currency, fxRates),
    previousClose: fromTry(day.previousClose, currency, fxRates),
  };
}

function isStale(
  series: ChartSeries | undefined,
  timeframe: Timeframe,
  currency: Currency,
  unit: ChartUnit,
): boolean {
  return !series || series.timeframe !== timeframe || series.currency !== currency || (series.unit ?? 'gram') !== unit;
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [requestedTimeframe, setTimeframe] = useState<Timeframe>('1D');
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('TRY');
  const [unit, setUnit] = useState<ChartUnit>('gram');
  const [ounceCurrency, setOunceCurrency] = useState<Currency>('USD');
  const { isPremium } = useSubscription();

  // Tercih korunur; Pro bitince görünüm ücretsiz seçeneğe düşer, alınınca kaldığı yerden sürer.
  const timeframe =
    isPremium || FREE_TIMEFRAMES.includes(requestedTimeframe) ? requestedTimeframe : '1D';
  const lockedTimeframes = useMemo(
    () => (isPremium ? NO_TIMEFRAMES : TIMEFRAMES.filter((tf) => !FREE_TIMEFRAMES.includes(tf))),
    [isPremium],
  );
  const lockedCurrencies = useMemo(
    () => (isPremium ? NO_CURRENCIES : CURRENCIES.filter((c) => !FREE_CURRENCIES.includes(c))),
    [isPremium],
  );
  const [chartStore, setChartStore] = useState<ChartStore>(EMPTY_STORE);
  const loadedAt = useRef(new Map<string, number>());
  const mounted = useRef(true);
  const chartRequest = useRef(0);

  const quotes = snapshot?.quotes ?? EMPTY_QUOTES;
  const goldRates = snapshot?.goldRates ?? EMPTY_GOLD_RATES;
  const fxRates = snapshot?.fxRates ?? EMPTY_FX_RATES;
  const currency = resolveCurrency(
    lockedCurrencies.includes(preferredCurrency) ? 'TRY' : preferredCurrency,
    fxRates,
  );

  const lockedOunceCurrencies = useMemo(
    () => (isPremium ? NO_CURRENCIES : CURRENCIES.filter((c) => !FREE_OUNCE_CURRENCIES.includes(c))),
    [isPremium],
  );
  // USD ons için kur gerektirmez; TL/EUR kur gelene kadar USD'de kalır.
  const ounceDisplayCurrency: Currency =
    ounceCurrency === 'USD' || lockedOunceCurrencies.includes(ounceCurrency)
      ? 'USD'
      : resolveCurrency(ounceCurrency, fxRates);
  const chartCurrency = unit === 'ounce' ? ounceDisplayCurrency : currency;
  const lockedChartCurrencies = unit === 'ounce' ? lockedOunceCurrencies : lockedCurrencies;
  const brentCurrency = ounceDisplayCurrency;

  const displayQuotes = useMemo(
    () =>
      currency === 'TRY'
        ? quotes
        : quotes.map((q) => ({
            ...q,
            bid: fromTry(q.bid, currency, fxRates),
            ask: fromTry(q.ask, currency, fxRates),
            day: convertDay(q.day, currency, fxRates),
            currency,
          })),
    [quotes, currency, fxRates],
  );

  // Ons fiyatı USD'dir; seçili para birimine güncel kurla çevrilir (USD'de olduğu gibi kalır).
  const ounceQuotes = snapshot?.ounceQuotes ?? EMPTY_QUOTES;
  const displayOunceQuotes = useMemo(() => {
    if (ounceDisplayCurrency === 'USD') return ounceQuotes;
    const usdTry = fxRates.USD;
    if (!usdTry) return EMPTY_QUOTES;
    const convert = (usd: number) => fromTry(usd * usdTry, ounceDisplayCurrency, fxRates);
    return ounceQuotes.map((q) => ({
      ...q,
      bid: convert(q.bid),
      ask: convert(q.ask),
      day: q.day && {
        open: convert(q.day.open),
        high: convert(q.day.high),
        low: convert(q.day.low),
        previousClose: convert(q.day.previousClose),
      },
      currency: ounceDisplayCurrency,
    }));
  }, [ounceQuotes, ounceDisplayCurrency, fxRates]);

  const displayGoldRates = useMemo(
    () =>
      currency === 'TRY'
        ? goldRates
        : goldRates.map((r) => ({
            ...r,
            bid: fromTry(r.bid, currency, fxRates),
            ask: fromTry(r.ask, currency, fxRates),
            day: convertDay(r.day, currency, fxRates),
          })),
    [goldRates, currency, fxRates],
  );

  /**
   * Para birimi değişince doğru seri gelene kadar mevcut grafik güncel kurla
   * çevrilerek gösterilir; ekran boşalıp yeniden çizilmez.
   */
  const rawCharts = useMemo<ChartMap>(() => {
    const picked: ChartMap = {};
    for (const symbol of CHART_SYMBOLS) {
      const p = seriesParams(symbol, unit, chartCurrency, brentCurrency);
      const series = chartStore.byKey[seriesKey(symbol, p.unit, timeframe, p.currency)] ?? chartStore.latest[`${symbol}|${p.unit}`];
      if (series) picked[symbol] = series;
    }
    return picked;
  }, [chartStore, unit, timeframe, chartCurrency, brentCurrency]);

  const charts = useMemo<ChartMap>(() => {
    const converted: ChartMap = {};
    for (const symbol of CHART_SYMBOLS) {
      const raw = rawCharts[symbol];
      const p = seriesParams(symbol, unit, chartCurrency, brentCurrency);
      // Başka birimin serisi yeni birimde gösterilmez; doğru seri gelene kadar yükleniyor görünür.
      if (!raw || (raw.unit ?? 'gram') !== p.unit) continue;
      if (raw.currency === p.currency) {
        converted[symbol] = raw;
        continue;
      }
      const from = raw.currency === 'TRY' ? 1 : fxRates[raw.currency];
      const to = p.currency === 'TRY' ? 1 : fxRates[p.currency];
      if (!from || !to) continue;
      const factor = from / to;
      converted[symbol] = {
        ...raw,
        currency: p.currency,
        points: raw.points.map((p) => ({ t: p.t, v: p.v * factor })),
      };
    }
    return converted;
  }, [rawCharts, chartCurrency, brentCurrency, fxRates, unit]);

  // Bayrakların özeti: yalnızca bir sembolün durumu değişince yeni nesne üretilir.
  const staleKey = CHART_SYMBOLS.map((s) => {
    const p = seriesParams(s, unit, chartCurrency, brentCurrency);
    return isStale(rawCharts[s], timeframe, p.currency, p.unit) ? '1' : '0';
  }).join('');
  const chartLoading = useMemo(
    () =>
      Object.fromEntries(CHART_SYMBOLS.map((s, i) => [s, staleKey[i] === '1'])) as Record<ChartSymbol, boolean>,
    [staleKey],
  );

  useEffect(() => {
    storageGet<Currency>(CURRENCY_STORAGE_KEY)
      .then((saved) => {
        if (saved && CURRENCIES.includes(saved)) setPreferredCurrency(saved);
      })
      .catch(() => {
        // Kayıtlı tercih okunamazsa TRY ile devam edilir.
      });
  }, []);

  const setCurrency = useCallback((next: Currency) => {
    setPreferredCurrency(next);
    storageSet(CURRENCY_STORAGE_KEY, next).catch(() => {
      // Tercih kaydedilemese de oturum içinde geçerli kalır.
    });
  }, []);

  const setChartCurrency = useCallback(
    (next: Currency) => {
      if (unit === 'ounce') setOunceCurrency(next);
      else setCurrency(next);
    },
    [unit, setCurrency],
  );

  const setBrentCurrency = setOunceCurrency;

  const refresh = useCallback(async () => {
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const next = await marketRepository.getSnapshot();
      if (!mounted.current) return;
      setSnapshot(next);
      setError(null);
      setState('ready');
    } catch (e) {
      if (!mounted.current) return;
      setError(userMessageForError(e, 'Piyasa verisi şu an alınamadı. Biraz sonra tekrar dene.'));
      setState('error');
    }
  }, []);

  const loadCharts = useCallback(
    async (tf: Timeframe, chartCurrency: Currency, chartUnit: ChartUnit, brentCcy: Currency, force = true) => {
      const paramsOf = (symbol: ChartSymbol) => seriesParams(symbol, chartUnit, chartCurrency, brentCcy);
      const keys = CHART_SYMBOLS.map((symbol) => {
        const p = paramsOf(symbol);
        return seriesKey(symbol, p.unit, tf, p.currency);
      });
      // Seçim için seriler yakın zamanda çekildiyse (ör. gram ⇄ ons geri dönüşü) ağa da gidilmez.
      const now = Date.now();
      if (!force && keys.every((k) => now - (loadedAt.current.get(k) ?? 0) < CHART_REFRESH_MS)) return;
      // Hızlı geçişlerde geç gelen eski yanıt yeni seçimin üzerine yazmasın.
      const request = ++chartRequest.current;
      const results = await Promise.all(
        CHART_SYMBOLS.map(async (symbol) => {
          try {
            const p = paramsOf(symbol);
            return await marketRepository.getHistory(symbol, tf, p.currency, p.unit);
          } catch {
            // Önceki seri ekranda kalır; boş grafiğe düşmek yerine bir sonraki yenilemede tekrar denenir.
            return null;
          }
        }),
      );
      if (!mounted.current || request !== chartRequest.current) return;
      const fresh = results.filter((s): s is ChartSeries => s !== null);
      if (!fresh.length) return;
      const stamp = Date.now();
      // Dört metalin serisi tek durum güncellemesiyle gelir: sağlayıcı ve grafikler bir kez çizilir.
      setChartStore((prev) => {
        const byKey = { ...prev.byKey };
        const latest = { ...prev.latest };
        for (const series of fresh) {
          const sku = series.unit ?? 'gram';
          const key = seriesKey(series.symbol as ChartSymbol, sku, tf, series.currency);
          byKey[key] = series;
          latest[`${series.symbol}|${sku}`] = series;
          loadedAt.current.set(key, stamp);
        }
        return { byKey, latest };
      });
    },
    [],
  );

  useEffect(() => {
    mounted.current = true;
    void refresh();
    // Arka planda istek atılmaz; ön plana dönüşte ilk tikte güncellenir. Piyasa kapalıyken (hafta
    // sonu) fiyat değişmediği için aralık uzar; açılışta kısalır.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          // Çevrimdışıyken yoklanmaz; bağlantı gelince `useNetworkRecovery` hemen yeniler.
          if (AppState.currentState !== 'background' && !networkMonitor.isOffline()) void refresh();
          schedule();
        },
        isMarketClosed() ? POLL_INTERVAL_CLOSED_MS : POLL_INTERVAL_MS,
      );
    };
    schedule();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  // Seriler periyot/para birimi değişince ve seyrek aralıkla çekilir; fiyat tikleri yalnızca son
  // noktayı (`livePrice`) günceller.
  useEffect(() => {
    void loadCharts(timeframe, chartCurrency, unit, brentCurrency, false);
    const id = setInterval(() => {
      if (AppState.currentState !== 'background' && !networkMonitor.isOffline()) void loadCharts(timeframe, chartCurrency, unit, brentCurrency);
    }, CHART_REFRESH_MS);
    return () => clearInterval(id);
  }, [timeframe, chartCurrency, unit, brentCurrency, loadCharts]);

  // Kopukluk bitince fiyat ve grafikler kullanıcı yenilemeden güncellenir.
  useNetworkRecovery(() => {
    void refresh();
    void loadCharts(timeframe, chartCurrency, unit, brentCurrency);
  });

  const value = useMemo<MarketContextValue>(
    () => ({
      state,
      error,
      snapshot,
      quotes,
      displayQuotes,
      displayOunceQuotes,
      goldRates,
      displayGoldRates,
      fxRates,
      currency,
      currencies: CURRENCIES,
      lockedCurrencies,
      lockedTimeframes,
      setCurrency,
      refresh,
      timeframes: TIMEFRAMES,
    }),
    [
      state,
      error,
      snapshot,
      quotes,
      displayQuotes,
      displayOunceQuotes,
      goldRates,
      displayGoldRates,
      fxRates,
      currency,
      lockedCurrencies,
      lockedTimeframes,
      setCurrency,
      refresh,
    ],
  );

  const chartValue = useMemo<MarketChartContextValue>(
    () => ({
      timeframe,
      unit,
      setUnit,
      chartCurrency,
      lockedChartCurrencies,
      setChartCurrency,
      brentCurrency,
      lockedBrentCurrencies: lockedOunceCurrencies,
      setBrentCurrency,
      charts,
      chartLoading,
      setTimeframe,
    }),
    [timeframe, unit, chartCurrency, lockedChartCurrencies, setChartCurrency, brentCurrency, lockedOunceCurrencies, setBrentCurrency, charts, chartLoading],
  );

  return (
    <MarketContext.Provider value={value}>
      <MarketChartContext.Provider value={chartValue}>{children}</MarketChartContext.Provider>
    </MarketContext.Provider>
  );
}

export function useMarketViewModel(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error('useMarketViewModel must be used within MarketProvider');
  }
  return ctx;
}

export function useMarketChart(): MarketChartContextValue {
  const ctx = useContext(MarketChartContext);
  if (!ctx) {
    throw new Error('useMarketChart must be used within MarketProvider');
  }
  return ctx;
}
