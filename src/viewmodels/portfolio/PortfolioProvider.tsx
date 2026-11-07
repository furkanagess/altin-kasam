import {
  portfolioRepository,
  type AddHoldingInput,
} from '@/src/data/repositories/portfolioRepository';
import type { Holding, MetalQuote, PortfolioSnapshot } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
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

type PortfolioContextValue = {
  state: LoadState;
  error: string | null;
  holdings: Holding[];
  snapshot: PortfolioSnapshot | null;
  refresh: () => Promise<void>;
  addHolding: (input: AddHoldingInput) => Promise<void>;
  removeHolding: (id: string) => Promise<void>;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { quotes } = useMarketViewModel();
  const quotesRef = useRef<MetalQuote[]>(quotes);
  quotesRef.current = quotes;

  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);

  const revalue = useCallback((list: Holding[], nextQuotes: MetalQuote[]) => {
    setSnapshot(portfolioRepository.valuePortfolio(list, nextQuotes));
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const list = await portfolioRepository.listHoldings();
      setHoldings(list);
      revalue(list, quotesRef.current);
      setError(null);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Portföy yüklenemedi');
      setState('error');
    }
  }, [revalue]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Canlı fiyat gelince mevcut holdingleri yeniden değerle (listeyi tekrar çekmeden).
  useEffect(() => {
    if (state !== 'ready') return;
    revalue(holdings, quotes);
  }, [quotes, holdings, revalue, state]);

  const addHolding = useCallback(
    async (input: AddHoldingInput) => {
      await portfolioRepository.addHolding(input);
      await refresh();
    },
    [refresh],
  );

  const removeHolding = useCallback(
    async (id: string) => {
      await portfolioRepository.removeHolding(id);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      state,
      error,
      holdings,
      snapshot,
      refresh,
      addHolding,
      removeHolding,
    }),
    [state, error, holdings, snapshot, refresh, addHolding, removeHolding],
  );

  return (
    <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>
  );
}

export function usePortfolioViewModel(): PortfolioContextValue {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error('usePortfolioViewModel must be used within PortfolioProvider');
  }
  return ctx;
}
