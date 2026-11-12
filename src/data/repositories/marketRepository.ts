import type { Currency, Timeframe } from '@/src/core/constants/app';
import type { IMarketDatasource } from '@/src/data/datasources/marketDatasource';
import { HasfiyatMarketDatasource } from '@/src/data/datasources/hasfiyatMarketDatasource';
import type { MetalSymbol } from '@/src/domain/enums';
import type { ChartSeries, MarketSnapshot } from '@/src/domain/models';

/**
 * Fiyatlar REST ile (Hasfiyat, sunucu ucu üzerinden) düzenli aralıklarla yenilenir; istek
 * başarısız olursa son başarılı snapshot `stale: true` olarak kalır.
 */
export class MarketRepository {
  private lastSnapshot: MarketSnapshot | null = null;

  constructor(private readonly datasource: IMarketDatasource = new HasfiyatMarketDatasource()) {}

  async getSnapshot(): Promise<MarketSnapshot> {
    try {
      const quotes = await this.datasource.fetchQuotes();
      this.lastSnapshot = { ...quotes, updatedAt: Date.now(), stale: false };
      return this.lastSnapshot;
    } catch (e) {
      if (!this.lastSnapshot) throw e;
      return { ...this.lastSnapshot, stale: true };
    }
  }

  async getHistory(symbol: MetalSymbol, timeframe: Timeframe, currency: Currency): Promise<ChartSeries> {
    const points = await this.datasource.fetchHistory(symbol, timeframe, currency);
    return { symbol, timeframe, currency, points };
  }
}

export const marketRepository = new MarketRepository();
