import type { Timeframe } from '@/src/core/constants/app';
import { fetchHasfiyatHistory } from '@/src/data/datasources/hasfiyatHistoryDatasource';
import { hasfiyatGoldRateItem } from '@/src/core/constants/hasfiyatPriceMap';
import { marketRepository } from '@/src/data/repositories/marketRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';

/** Periyotlar arasında gidip gelirken aynı çeşidin serisi bu sürede yeniden çekilmez. */
const CACHE_TTL_MS = 5 * 60_000;

export type GoldRateHistory = {
  assetId: string;
  timeframe: Timeframe;
  /** TRY alış fiyatı; `estimate` ise gram altın (24 ayar) fiyatıdır. */
  points: CandlePoint[];
  /**
   * `estimate`: çeşidin kendi geçmişi yok; gösterirken güncel çeşit/gram fiyat oranıyla
   * ölçeklenmelidir (seri gram altının şeklini taşır).
   */
  source: 'hasfiyat' | 'estimate';
};

/**
 * Altın çeşidi başına fiyat geçmişi: Harem kalemi varsa Hasfiyat'tan, yoksa gram altın
 * geçmişi. Periyotlar arasında gidip gelirken aynı istek beş dakika tekrarlanmaz.
 */
export class GoldRateHistoryRepository {
  private readonly cache = new Map<string, { at: number; history: Promise<GoldRateHistory> }>();

  getHistory(assetId: string, timeframe: Timeframe): Promise<GoldRateHistory> {
    const key = `${assetId}:${timeframe}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.history;
    const history = this.load(assetId, timeframe);
    this.cache.set(key, { at: Date.now(), history });
    history.catch(() => {
      if (this.cache.get(key)?.history === history) this.cache.delete(key);
    });
    return history;
  }

  private async load(assetId: string, timeframe: Timeframe): Promise<GoldRateHistory> {
    const item = hasfiyatGoldRateItem(assetId);
    if (item) {
      try {
        const points = await fetchHasfiyatHistory(item.title, item.units, timeframe);
        if (points.length >= 2) return { assetId, timeframe, points, source: 'hasfiyat' };
      } catch {
        // Hasfiyat geçmişine ulaşılamazsa gram altın geçmişine düşülür.
      }
    }
    const gram = await marketRepository.getHistory(MetalSymbol.XAU, timeframe, 'TRY');
    return { assetId, timeframe, points: gram.points, source: 'estimate' };
  }
}

export const goldRateHistoryRepository = new GoldRateHistoryRepository();
