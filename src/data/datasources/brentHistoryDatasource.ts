import type { Currency, Timeframe } from '@/src/core/constants/app';
import { fetchHasfiyatHistory } from '@/src/data/datasources/hasfiyatHistoryDatasource';
import { valueAt } from '@/src/data/datasources/hasfiyatMetalHistoryDatasource';
import type { HasfiyatHistoryResponse } from '@/src/data/datasources/hasfiyatTypes';
import { fetchJson } from '@/src/data/datasources/http';
import type { CandlePoint } from '@/src/domain/models';

const ENDPOINT = '/api/brent';
/** Grafik için yeterli çözünürlük. */
const MAX_POINTS = 200;

function downsample(points: CandlePoint[], max: number): CandlePoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/**
 * Brent petrolün varil başına geçmişi. Kaynak USD'dir; TL ve EUR için aynı anın USD/TL (ve
 * EUR/TL) değeriyle çevrilir, kur serisi alınamazsa grafik boş döner.
 */
export async function fetchBrentHistory(timeframe: Timeframe, currency: Currency): Promise<CandlePoint[]> {
  const [{ points }, usd, eur] = await Promise.all([
    fetchJson<HasfiyatHistoryResponse>(`${ENDPOINT}?timeframe=${timeframe}`),
    currency === 'USD' ? Promise.resolve(null) : fetchHasfiyatHistory('USD/TL', 1, timeframe),
    currency === 'EUR' ? fetchHasfiyatHistory('EUR/TL', 1, timeframe) : Promise.resolve(null),
  ]);
  const series = downsample(points, MAX_POINTS);
  if (currency === 'USD') return series;
  const usdTry = usd ? valueAt(usd) : null;
  const eurTry = eur ? valueAt(eur) : null;
  return series.flatMap((p) => {
    const rate = usdTry?.(p.t);
    if (!rate) return [];
    if (currency === 'TRY') return [{ t: p.t, v: p.v * rate }];
    const eurRate = eurTry?.(p.t);
    return eurRate ? [{ t: p.t, v: (p.v * rate) / eurRate }] : [];
  });
}
