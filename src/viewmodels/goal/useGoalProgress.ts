import { goalRepository } from '@/src/data/repositories/goalRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { GoalProgressView } from '@/src/domain/models';
import { fromTry } from '@/src/utils/currency';
import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { useMemo } from 'react';

/** Gram altının kuyumcu satış fiyatı (TRY); kalan hedefin tahmini maliyeti için. */
export function useGramAskPrice(): number | undefined {
  const { goldRates, quotes } = useMarketViewModel();
  return (
    goldRates.find((r) => r.assetId === 'gram-24')?.ask ??
    quotes.find((q) => q.symbol === MetalSymbol.XAU)?.ask
  );
}

/** Hedef yoksa null. */
export function useGoalProgress(): GoalProgressView | null {
  const { goal } = useGoal();
  const { holdings } = usePortfolioViewModel();
  const { currency, fxRates } = useMarketViewModel();
  const gramAsk = useGramAskPrice();

  return useMemo(() => {
    if (!goal) return null;
    const progress = goalRepository.computeProgress(goal, holdings);
    const money = (value: number) => fromTry(value, currency, fxRates);
    return {
      ...progress,
      currency,
      display: {
        spent: money(progress.spent),
        remainingCost: gramAsk ? money(progress.remainingGrams * gramAsk) : null,
      },
    };
  }, [goal, holdings, currency, fxRates, gramAsk]);
}
