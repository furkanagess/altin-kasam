import type { ChartUnit, Currency, Timeframe } from '@/src/core/constants/app';
import type { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint, MarketQuotes } from '@/src/domain/models';

export interface IHistoryDatasource {
  /** Seri, istenen para biriminde ve o dönemin kuruyla döner. */
  fetchHistory(
    symbol: MetalSymbol,
    timeframe: Timeframe,
    currency: Currency,
    unit?: ChartUnit,
  ): Promise<CandlePoint[]>;
}

export interface IMarketDatasource extends IHistoryDatasource {
  fetchQuotes(): Promise<MarketQuotes>;
}
