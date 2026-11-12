import type { Timeframe } from '@/src/core/constants/app';
import { goldRateHistoryRepository, type GoldRateHistory } from '@/src/data/repositories/goldRateHistoryRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';
import { fromTry } from '@/src/utils/currency';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useEffect, useMemo, useState } from 'react';

export type GoldRateChart = {
  /** Gösterim para biriminde (güncel kurla çevrilir). */
  points: CandlePoint[];
  loading: boolean;
  source: GoldRateHistory['source'] | null;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
};

/** Bir altın çeşidinin kendi grafiği; periyodu Piyasa ekranındaki grafiklerden bağımsızdır. */
export function useGoldRateChart(assetId: string, initialTimeframe: Timeframe = '1D'): GoldRateChart {
  const { goldRates, quotes, currency, fxRates, lockedTimeframes } = useMarketViewModel();
  const [requested, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const timeframe = lockedTimeframes.includes(requested) ? '1D' : requested;
  const [history, setHistory] = useState<GoldRateHistory | null>(null);

  useEffect(() => {
    let alive = true;
    goldRateHistoryRepository
      .getHistory(assetId, timeframe)
      .then((next) => {
        if (alive) setHistory(next);
      })
      .catch(() => {
        // Önceki seri ekranda kalır; bir sonraki seçimde tekrar denenir.
      });
    return () => {
      alive = false;
    };
  }, [assetId, timeframe]);

  const assetBid = goldRates.find((r) => r.assetId === assetId)?.bid ?? 0;
  const gramBid = quotes.find((q) => q.symbol === MetalSymbol.XAU)?.bid ?? 0;
  // Yaklaşık seride oran güncel fiyatlarla uygulanır; kendi geçmişi olan çeşitte 1'dir.
  const ratio = history?.source === 'estimate' ? (gramBid > 0 ? assetBid / gramBid : 0) : 1;

  const points = useMemo(() => {
    if (!history || !ratio) return [];
    return history.points.map((p) => {
      const tryValue = p.v * ratio;
      return { t: p.t, v: currency === 'TRY' ? tryValue : fromTry(tryValue, currency, fxRates) };
    });
  }, [history, ratio, currency, fxRates]);

  const loading = !(history?.assetId === assetId && history.timeframe === timeframe);
  return { points, loading, source: history?.source ?? null, timeframe, setTimeframe };
}
