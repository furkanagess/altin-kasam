import type { Currency, Timeframe } from '@/src/core/constants/app';
import { getOtherAsset } from '@/src/core/constants/portfolioAssets';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { portfolioRepository, type PortfolioHistory } from '@/src/data/repositories/portfolioRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { useEffect, useMemo, useState } from 'react';

export type PortfolioChart = {
  points: CandlePoint[];
  /** `points` ile aynı uzunlukta: o ana kadar yatırılan toplam tutar (kâr/zarar tabanı). */
  cost: number[];
  loading: boolean;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  timeframes: readonly Timeframe[];
  lockedTimeframes: readonly Timeframe[];
};

type LoadedHistory = PortfolioHistory & { timeframe: Timeframe; key: string };

/**
 * Toplam varlık grafiği: her kalem alındığı andan itibaren kendi fiyat geçmişiyle değerlenir,
 * değişim yatırılan tutara göre gösterilir. Piyasa ekranının grafik seçiminden bağımsızdır.
 */
export function usePortfolioChart(initialTimeframe: Timeframe = '1D'): PortfolioChart {
  const { currency, timeframes, lockedTimeframes } = useMarketViewModel();
  const { snapshot } = usePortfolioViewModel();
  const [requested, setTimeframe] = useState<Timeframe>(initialTimeframe);
  // Pro bitince seçim korunur ama görünüm ücretsiz periyoda düşer.
  const timeframe = lockedTimeframes.includes(requested) ? '1D' : requested;
  const [history, setHistory] = useState<LoadedHistory | null>(null);

  // Kasada hangi birimler varsa yalnızca onların geçmişi istenir; anahtar değişmedikçe yeniden istek yok.
  const holdings = snapshot?.holdings;
  const needsKey = useMemo(() => {
    const metals = new Set<MetalSymbol>();
    const cash = new Set<Currency>();
    for (const h of holdings ?? []) {
      const other = getOtherAsset(h.assetId);
      if (other?.kind === 'metal') metals.add(other.metal);
      if (other?.kind === 'cash' && other.currency !== currency) cash.add(other.currency);
    }
    return `${[...metals].sort().join(',')}|${[...cash].sort().join(',')}`;
  }, [holdings, currency]);

  useEffect(() => {
    let alive = true;
    const [metalPart, cashPart] = needsKey.split('|');
    const metals = (metalPart ? metalPart.split(',') : []) as MetalSymbol[];
    const cash = (cashPart ? cashPart.split(',') : []) as Currency[];
    const points = (symbol: MetalSymbol, inCurrency: Currency) =>
      marketRepository.getHistory(symbol, timeframe, inCurrency).then((s) => s.points);

    Promise.all([
      points(MetalSymbol.XAU, currency),
      Promise.all(cash.map((c) => points(MetalSymbol.XAU, c).catch(() => null))),
      Promise.all(metals.map((m) => points(m, currency).catch(() => null))),
    ])
      .then(([gold, goldByCash, metalSeries]) => {
        if (!alive) return;
        setHistory({
          timeframe,
          currency,
          key: needsKey,
          gold,
          goldBy: Object.fromEntries(cash.flatMap((c, i) => (goldByCash[i] ? [[c, goldByCash[i]]] : []))),
          metals: Object.fromEntries(metals.flatMap((m, i) => (metalSeries[i] ? [[m, metalSeries[i]]] : []))),
        });
      })
      .catch(() => {
        // Önceki seri ekranda kalır; bir sonraki seçimde tekrar denenir.
      });
    return () => {
      alive = false;
    };
  }, [timeframe, currency, needsKey]);

  const loading = !(history?.timeframe === timeframe && history.currency === currency && history.key === needsKey);

  // Yeni periyot/para birimi gelene kadar önceki seri gösterilir; grafik boşalıp yeniden kurulmaz.
  const series = useMemo(
    () =>
      history && holdings && history.currency === currency
        ? portfolioRepository.valueSeries(holdings, history)
        : { points: [], cost: [] },
    [history, holdings, currency],
  );

  return { points: series.points, cost: series.cost, loading, timeframe, setTimeframe, timeframes, lockedTimeframes };
}
