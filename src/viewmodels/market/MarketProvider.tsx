import {
  CURRENCIES,
  CHART_REFRESH_MS,
  POLL_INTERVAL_CLOSED_MS,
  POLL_INTERVAL_MS,
  TIMEFRAMES,
  type Currency,
  type Timeframe,
} from '@/src/core/constants/app';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { MetalSymbol } from '@/src/domain/enums';
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

/** Grafiği gösterilen metaller; hepsinin serisi birlikte yüklenir, aralarında geçiş anlıktır. */
export const CHART_SYMBOLS = [MetalSymbol.XAU, MetalSymbol.XAG, MetalSymbol.XPT, MetalSymbol.XPD] as const;
export type ChartSymbol = (typeof CHART_SYMBOLS)[number];
type ChartMap = Partial<Record<ChartSymbol, ChartSeries>>;

/**
 * Grafik durumu fiyatlardan ayrı tutulur: periyot değişince yalnızca grafiği
 * okuyan bileşenler yeniden çizilir; fiyat satırları, portföy ve widget etkilenmez.
 */
type MarketChartContextValue = {
  timeframe: Timeframe;
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

function isStale(series: ChartSeries | undefined, timeframe: Timeframe, currency: Currency): boolean {
  return !series || series.timeframe !== timeframe || series.currency !== currency;
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [requestedTimeframe, setTimeframe] = useState<Timeframe>('1D');
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>('TRY');
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
  const [rawCharts, setCharts] = useState<ChartMap>({});
  const mounted = useRef(true);
  const chartRequest = useRef(0);

  const quotes = snapshot?.quotes ?? EMPTY_QUOTES;
  const goldRates = snapshot?.goldRates ?? EMPTY_GOLD_RATES;
  const fxRates = snapshot?.fxRates ?? EMPTY_FX_RATES;
  const currency = resolveCurrency(
    lockedCurrencies.includes(preferredCurrency) ? 'TRY' : preferredCurrency,
    fxRates,
  );

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
  const charts = useMemo<ChartMap>(() => {
    const converted: ChartMap = {};
    for (const symbol of CHART_SYMBOLS) {
      const raw = rawCharts[symbol];
      if (!raw) continue;
      if (raw.currency === currency) {
        converted[symbol] = raw;
        continue;
      }
      const from = raw.currency === 'TRY' ? 1 : fxRates[raw.currency];
      const to = currency === 'TRY' ? 1 : fxRates[currency];
      if (!from || !to) continue;
      const factor = from / to;
      converted[symbol] = {
        ...raw,
        currency,
        points: raw.points.map((p) => ({ t: p.t, v: p.v * factor })),
      };
    }
    return converted;
  }, [rawCharts, currency, fxRates]);

  // Bayrakların özeti: yalnızca bir sembolün durumu değişince yeni nesne üretilir.
  const staleKey = CHART_SYMBOLS.map((s) => (isStale(rawCharts[s], timeframe, currency) ? '1' : '0')).join('');
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
      setError(e instanceof Error ? e.message : 'Piyasa verisi alınamadı');
      setState('error');
    }
  }, []);

  const loadCharts = useCallback(async (tf: Timeframe, chartCurrency: Currency) => {
    // Hızlı geçişlerde geç gelen eski yanıt yeni seçimin üzerine yazmasın.
    const request = ++chartRequest.current;
    await Promise.all(
      CHART_SYMBOLS.map(async (symbol) => {
        try {
          const series = await marketRepository.getHistory(symbol, tf, chartCurrency);
          if (mounted.current && request === chartRequest.current) {
            setCharts((prev) => ({ ...prev, [symbol]: series }));
          }
        } catch {
          // Önceki seri ekranda kalır; boş grafiğe düşmek yerine bir sonraki yenilemede tekrar denenir.
        }
      }),
    );
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    // Arka planda istek atılmaz; ön plana dönüşte ilk tikte güncellenir. Piyasa kapalıyken (hafta
    // sonu) fiyat değişmediği için aralık uzar; açılışta kısalır.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          if (AppState.currentState !== 'background') void refresh();
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
    void loadCharts(timeframe, currency);
    const id = setInterval(() => {
      if (AppState.currentState !== 'background') void loadCharts(timeframe, currency);
    }, CHART_REFRESH_MS);
    return () => clearInterval(id);
  }, [timeframe, currency, loadCharts]);

  const value = useMemo<MarketContextValue>(
    () => ({
      state,
      error,
      snapshot,
      quotes,
      displayQuotes,
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
    () => ({ timeframe, charts, chartLoading, setTimeframe }),
    [timeframe, charts, chartLoading],
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
