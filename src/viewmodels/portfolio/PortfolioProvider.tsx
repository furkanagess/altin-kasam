import {
  portfolioRepository,
  type AddHoldingInput,
} from '@/src/data/repositories/portfolioRepository';
import type { Holding, PortfolioSnapshot } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const list = await portfolioRepository.listHoldings();
      setHoldings(list);
      setSnapshot(portfolioRepository.valuePortfolio(list, quotes));
      setError(null);
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Portföy yüklenemedi');
      setState('error');
    }
  }, [quotes]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
