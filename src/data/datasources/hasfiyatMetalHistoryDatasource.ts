import type { ChartUnit, Currency, Timeframe } from '@/src/core/constants/app';
import { fetchHasfiyatHistory } from '@/src/data/datasources/hasfiyatHistoryDatasource';
import type { IHistoryDatasource } from '@/src/data/datasources/marketDatasource';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';
import { usdPerOunceToTryPerGram } from '@/src/utils/metal';

/**
 * Metal grafikleri için Harem kalemleri. Altın ve gümüş doğrudan TL/gram; platin ve paladyum
 * USD/ons olduğu için aynı anın USD/TL değeriyle gram TL'ye çevrilir. Geçmiş Harem'in alış
 * kapanışlarıdır (uygulamanın geri kalanıyla aynı taraf).
 */
const SERIES: Record<MetalSymbol, { title: string; unit: 'tryPerGram' | 'usdPerOunce' }> = {
  [MetalSymbol.XAU]: { title: 'KÜLÇE ALTIN', unit: 'tryPerGram' },
  [MetalSymbol.XAG]: { title: 'GÜMÜŞ TL', unit: 'tryPerGram' },
  [MetalSymbol.XPT]: { title: 'PLATİN ONS', unit: 'usdPerOunce' },
  [MetalSymbol.XPD]: { title: 'PALADYUM ONS', unit: 'usdPerOunce' },
};

/** Ons grafikleri: uluslararası spot (USD/ons), Hasfiyat'ın ons kalemleri. */
const OUNCE_TITLES: Record<MetalSymbol, string> = {
  [MetalSymbol.XAU]: 'ONS',
  [MetalSymbol.XAG]: 'GÜMÜŞ ONS',
  [MetalSymbol.XPT]: 'PLATİN ONS',
  [MetalSymbol.XPD]: 'PALADYUM ONS',
};

/** Zaman sıralı seride `t` anındaki (ya da hemen önceki) değer; seri başlamadan önce ilk değer. */
export function valueAt(series: CandlePoint[]): (t: number) => number | undefined {
  return (t) => {
    let found: number | undefined = series[0]?.v;
    for (const p of series) {
      if (p.t > t) break;
      found = p.v;
    }
    return found;
  };
}

export class HasfiyatMetalHistoryDatasource implements IHistoryDatasource {
  /**
   * Ons serisi USD'dir; TL ve EUR için aynı anın USD/TL (ve EUR/TL) değeriyle çevrilir.
   * USD'de ek seri indirilmez.
   */
  private async fetchOunceHistory(symbol: MetalSymbol, timeframe: Timeframe, currency: Currency): Promise<CandlePoint[]> {
    const title = OUNCE_TITLES[symbol];
    if (!title) return [];
    const [base, usd, eur] = await Promise.all([
      fetchHasfiyatHistory(title, 1, timeframe),
      currency === 'USD' ? Promise.resolve(null) : fetchHasfiyatHistory('USD/TL', 1, timeframe),
      currency === 'EUR' ? fetchHasfiyatHistory('EUR/TL', 1, timeframe) : Promise.resolve(null),
    ]);
    if (currency === 'USD') return base;
    const usdTry = usd ? valueAt(usd) : null;
    const eurTry = eur ? valueAt(eur) : null;
    return base.flatMap((p) => {
      const rate = usdTry?.(p.t);
      if (!rate) return [];
      if (currency === 'TRY') return [{ t: p.t, v: p.v * rate }];
      const eurRate = eurTry?.(p.t);
      return eurRate ? [{ t: p.t, v: (p.v * rate) / eurRate }] : [];
    });
  }

  async fetchHistory(
    symbol: MetalSymbol,
    timeframe: Timeframe,
    currency: Currency,
    unit: ChartUnit = 'gram',
  ): Promise<CandlePoint[]> {
    if (unit === 'ounce') return this.fetchOunceHistory(symbol, timeframe, currency);
    const spec = SERIES[symbol];
    if (!spec) return [];
    const needUsd = spec.unit === 'usdPerOunce' || currency === 'USD';
    const [base, usd, eur] = await Promise.all([
      fetchHasfiyatHistory(spec.title, 1, timeframe),
      needUsd ? fetchHasfiyatHistory('USD/TL', 1, timeframe) : Promise.resolve(null),
      currency === 'EUR' ? fetchHasfiyatHistory('EUR/TL', 1, timeframe) : Promise.resolve(null),
    ]);
    const usdTry = usd ? valueAt(usd) : null;
    const eurTry = eur ? valueAt(eur) : null;

    return base.flatMap((p) => {
      const rate = usdTry?.(p.t);
      const tryPerGram = spec.unit === 'usdPerOunce' ? (rate ? usdPerOunceToTryPerGram(p.v, rate) : undefined) : p.v;
      if (!tryPerGram) return [];
      if (currency === 'TRY') return [{ t: p.t, v: tryPerGram }];
      const fx = currency === 'USD' ? rate : eurTry?.(p.t);
      return fx ? [{ t: p.t, v: tryPerGram / fx }] : [];
    });
  }
}
