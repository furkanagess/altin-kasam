import type { Timeframe } from '@/src/core/constants/app';
import {
  MockMarketDatasource,
  type IMarketDatasource,
} from '@/src/data/datasources/mockMarketDatasource';
import type { MetalSymbol } from '@/src/domain/enums';
import type { ChartSeries, MarketSnapshot } from '@/src/domain/models';

export class MarketRepository {
  private lastSuccessAt = 0;

  constructor(private readonly datasource: IMarketDatasource = new MockMarketDatasource()) {}

  async getSnapshot(staleAfterMs = 15_000): Promise<MarketSnapshot> {
    const quotes = await this.datasource.fetchQuotes();
    this.lastSuccessAt = Date.now();
    return {
      quotes,
      updatedAt: this.lastSuccessAt,
      stale: false,
    };
  }

  markStale(snapshot: MarketSnapshot, staleAfterMs = 15_000): MarketSnapshot {
    return {
      ...snapshot,
      stale: Date.now() - snapshot.updatedAt > staleAfterMs,
    };
  }

  async getHistory(symbol: MetalSymbol, timeframe: Timeframe): Promise<ChartSeries> {
    const points = await this.datasource.fetchHistory(symbol, timeframe);
    return { symbol, timeframe, points };
  }
}

export const marketRepository = new MarketRepository();
