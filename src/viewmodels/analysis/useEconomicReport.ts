import type { Currency, Timeframe } from '@/src/core/constants/app';
import type { EconomicEventReport } from '@/src/data/datasources/economicReportTypes';
import {
  economicReportRepository,
  REACTION_WINDOW_MS,
  type PriceReaction,
  type ReportAnalysis,
} from '@/src/data/repositories/economicReportRepository';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { MetalSymbol } from '@/src/domain/enums';
import { useEffect, useMemo, useState } from 'react';

export type ReportReaction = { currency: Currency; gold: PriceReaction | null; silver: PriceReaction | null };

type State = {
  id: string | undefined;
  report: EconomicEventReport | null;
  reaction: ReportReaction | null;
  failed: boolean;
};

/**
 * Açıklanmış olay raporu ve fiyat tepkisi. ABD olaylarında ons (USD), Türkiye olaylarında gram (TL)
 * fiyatı ölçülür. Yakın olaylarda 15 dakikalık, eskilerde 4 saatlik mumlar kullanılır.
 */
export function useEconomicReport(id: string | undefined, enabled: boolean) {
  const [state, setState] = useState<State>({ id: undefined, report: null, reaction: null, failed: false });

  useEffect(() => {
    if (!id || !enabled) return;
    let alive = true;
    economicReportRepository
      .getReport(id)
      .then(async (report) => {
        if (!alive) return;
        setState({ id, report, reaction: null, failed: false });
        const currency: Currency = report.event.country === 'US' ? 'USD' : 'TRY';
        const age = Date.now() - Date.parse(report.event.at);
        const timeframe: Timeframe = age < REACTION_WINDOW_MS - 2 * 3_600_000 ? '1D' : '1M';
        const reactionOf = (symbol: MetalSymbol) =>
          marketRepository
            .getHistory(symbol, timeframe, currency)
            .then((series) => economicReportRepository.reaction(series.points, report.event.at))
            .catch(() => null);
        const [gold, silver] = await Promise.all([reactionOf(MetalSymbol.XAU), reactionOf(MetalSymbol.XAG)]);
        if (alive) setState({ id, report, reaction: { currency, gold, silver }, failed: false });
      })
      .catch(() => {
        if (alive) setState({ id, report: null, reaction: null, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [id, enabled]);

  const current = state.id === id ? state : null;
  const report = current?.report ?? null;
  const analysis = useMemo<ReportAnalysis | null>(
    () => (report ? economicReportRepository.analyze(report) : null),
    [report],
  );

  return {
    report,
    analysis,
    reaction: current?.reaction ?? null,
    loading: enabled && !!id && !current,
    failed: current?.failed ?? false,
  };
}
