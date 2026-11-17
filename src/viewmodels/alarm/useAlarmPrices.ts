import type { AlarmPrices } from '@/src/core/constants/alarmAssets';
import { portfolioRepository } from '@/src/data/repositories/portfolioRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { MetalQuote } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { useMemo } from 'react';

const NO_QUOTES: MetalQuote[] = [];

/** Alarmların izlediği güncel değerler; kasa değeri gösterim para biriminden bağımsız TRY'dir. */
export function useAlarmPrices(): AlarmPrices {
  const { goldRates, quotes, fxRates, snapshot } = useMarketViewModel();
  const { holdings } = usePortfolioViewModel();
  const providerRatio = snapshot?.goldSilverRatio;
  const ounceQuotes = snapshot?.ounceQuotes ?? NO_QUOTES;
  return useMemo(() => {
    const portfolioValue = holdings.length
      ? portfolioRepository.valuePortfolio(holdings, quotes, goldRates, 'TRY', fxRates).totalValue
      : undefined;
    // Kaynak rasyo vermezse gram fiyatlarının oranı: aynı para birimi ve birimde, onsla aynı oran.
    const gold = quotes.find((q) => q.symbol === MetalSymbol.XAU)?.bid;
    const silver = quotes.find((q) => q.symbol === MetalSymbol.XAG)?.bid;
    const ratio = providerRatio ?? (gold && silver ? gold / silver : undefined);
    return { goldRates, quotes, ounceQuotes, portfolioValue, ratio };
  }, [holdings, quotes, ounceQuotes, goldRates, fxRates, providerRatio]);
}
