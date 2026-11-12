import type { Timeframe } from '@/src/core/constants/app';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useEffect, useMemo, useState } from 'react';

export type GoldSilverRatioChart = {
  points: CandlePoint[];
  /** Güncel rasyo (Hasfiyat "ALTIN/GÜMÜŞ"); serinin son noktası buna hizalanır. */
  ratio: number | undefined;
  loading: boolean;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
  timeframes: readonly Timeframe[];
  lockedTimeframes: readonly Timeframe[];
};

/**
 * Rasyo geçmişi: aynı mumdaki altın ve gümüş fiyatlarının oranı. Birim (gram/ons) ve para birimi
 * oranda sadeleştiği için seri USD'de çekilir; kur dönüşümü hesaba gürültü katmaz.
 */
export function useGoldSilverRatioChart(initialTimeframe: Timeframe = '1D'): GoldSilverRatioChart {
  const { snapshot, timeframes, lockedTimeframes } = useMarketViewModel();
  const [requested, setTimeframe] = useState<Timeframe>(initialTimeframe);
  // Pro bitince seçim korunur ama görünüm ücretsiz periyoda düşer.
  const timeframe = lockedTimeframes.includes(requested) ? '1D' : requested;
  const [history, setHistory] = useState<{ timeframe: Timeframe; points: CandlePoint[] } | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      marketRepository.getHistory(MetalSymbol.XAU, timeframe, 'USD'),
      marketRepository.getHistory(MetalSymbol.XAG, timeframe, 'USD'),
    ])
      .then(([gold, silver]) => {
        if (!alive) return;
        const silverAt = new Map(silver.points.map((p) => [p.t, p.v]));
        const points = gold.points.flatMap((p) => {
          const s = silverAt.get(p.t);
          return s ? [{ t: p.t, v: p.v / s }] : [];
        });
        setHistory({ timeframe, points });
      })
      .catch(() => {
        // Önceki seri ekranda kalır; bir sonraki seçimde tekrar denenir.
      });
    return () => {
      alive = false;
    };
  }, [timeframe]);

  const ratio = snapshot?.goldSilverRatio;
  // Geçmiş başka kaynaktan geldiği için güncel rasyoyla arada küçük fark olabilir; seri
  // orantılı ölçeklenir ki son nokta canlı değerden kopmasın.
  const points = useMemo(() => {
    const series = history?.points ?? [];
    const last = series[series.length - 1]?.v;
    if (!ratio || !last) return series;
    const scale = ratio / last;
    return series.map((p) => ({ t: p.t, v: p.v * scale }));
  }, [history, ratio]);

  return {
    points,
    ratio,
    loading: history?.timeframe !== timeframe,
    timeframe,
    setTimeframe,
    timeframes,
    lockedTimeframes,
  };
}
