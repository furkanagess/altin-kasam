import {
  POLL_INTERVAL_MS,
  TIMEFRAMES,
  type Timeframe,
} from '@/src/core/constants/app';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { ChartSeries, MarketSnapshot, MetalQuote } from '@/src/domain/models';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type MarketContextValue = {
  state: LoadState;
  error: string | null;
  snapshot: MarketSnapshot | null;
  quotes: MetalQuote[];
  selectedSymbol: MetalSymbol;
  timeframe: Timeframe;
  chart: ChartSeries | null;
  setSelectedSymbol: (symbol: MetalSymbol) => void;
  setTimeframe: (tf: Timeframe) => void;
  refresh: () => Promise<void>;
  timeframes: readonly Timeframe[];
};

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<MetalSymbol>(MetalSymbol.XAU);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chart, setChart] = useState<ChartSeries | null>(null);
  const mounted = useRef(true);

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

  const loadChart = useCallback(async (symbol: MetalSymbol, tf: Timeframe) => {
    try {
      const series = await marketRepository.getHistory(symbol, tf);
      if (mounted.current) setChart(series);
    } catch {
      if (mounted.current) setChart(null);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  useEffect(() => {
    void loadChart(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, loadChart, snapshot?.updatedAt]);

  const value = useMemo<MarketContextValue>(
    () => ({
      state,
      error,
      snapshot,
      quotes: snapshot?.quotes ?? [],
      selectedSymbol,
      timeframe,
      chart,
      setSelectedSymbol,
      setTimeframe,
      refresh,
      timeframes: TIMEFRAMES,
    }),
    [state, error, snapshot, selectedSymbol, timeframe, chart, refresh],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}

export function useMarketViewModel(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error('useMarketViewModel must be used within MarketProvider');
  }
  return ctx;
}
