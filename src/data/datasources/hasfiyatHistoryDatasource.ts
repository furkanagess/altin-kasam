import { HISTORY_LONG_TTL_S, HISTORY_TTL_S } from '@/src/core/constants/hasfiyatCache';
import { TIMEFRAME_SPAN_MS, type Timeframe } from '@/src/core/constants/app';
import type { HasfiyatHistoryResponse } from '@/src/data/datasources/hasfiyatTypes';
import { fetchJson } from '@/src/data/datasources/http';
import type { CandlePoint } from '@/src/domain/models';

const ENDPOINT = '/api/history';
const LONG_ENDPOINT = '/api/history-long';
/** Grafik için yeterli çözünürlük; saatlik 1A (~720 bar) bu kadara seyreltilir. */
const MAX_POINTS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Harem geçmişinin sınırları: saatlik bar 45 gün saklanır ve istek başına en fazla 31 gün,
 * günlük bar 4 Ekim 2026'dan beri birikir; öncesi `prependBackfill` ile tamamlanır.
 */
const PLAN: Record<Timeframe, { period: '1h' | '1d' }> = {
  '1D': { period: '1h' },
  '1W': { period: '1h' },
  '1M': { period: '1h' },
  '3M': { period: '1d' },
  '1Y': { period: '1d' },
};

/**
 * Her periyot için tek bir `from` kullanılır (o periyodun en geniş penceresi); kısa pencereler
 * istemcide `since` ile kırpılır. Aksi halde 1D/1W/1M ve 3M/1Y ayrı CDN anahtarı, yani aynı seri
 * için ayrı Hasfiyat isteği olurdu: periyotlar arasında gezmek istek sayısını 2-3 katına çıkarırdı.
 */
const FETCH_DAYS = { '1h': 30, '1d': 366 } as const;

/** Hasfiyat kalemi → tamamlama serisi; listede olmayanlar (ziynet, bilezik…) altın hareketini izler. */
const BACKFILL_SERIES: Record<string, 'silver' | 'platinum' | 'palladium' | 'usd' | 'eur'> = {
  'GÜMÜŞ TL': 'silver',
  'PLATİN ONS': 'platinum',
  'PALADYUM ONS': 'palladium',
  'USD/TL': 'usd',
  'EUR/TL': 'eur',
};
/** Hasfiyat serisinin başlamasına bu kadar yakınsa eksik veri sayılmaz. */
const GAP_TOLERANCE_MS = 3 * DAY_MS;

/**
 * Aynı serinin (ör. USD/TL, hem platin hem rasyo grafiği için) aynı anda birden çok kez istenmesini
 * ve kısa sürede tekrar indirilmesini önler. Süreler sunucu önbelleğiyle aynıdır (`hasfiyatCache`).
 */
const memo = new Map<string, { at: number; ttlMs: number; promise: Promise<HasfiyatHistoryResponse> }>();

function fetchSeries(url: string, ttlSeconds: number): Promise<HasfiyatHistoryResponse> {
  const hit = memo.get(url);
  if (hit && Date.now() - hit.at < hit.ttlMs) return hit.promise;
  const promise = fetchJson<HasfiyatHistoryResponse>(url);
  memo.set(url, { at: Date.now(), ttlMs: ttlSeconds * 1000, promise });
  // Başarısız istek saklanmaz; bir sonraki çağrı yeniden dener.
  promise.catch(() => {
    if (memo.get(url)?.promise === promise) memo.delete(url);
  });
  return promise;
}

const istanbulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });

function downsample(points: CandlePoint[], max: number): CandlePoint[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/** Bir Harem kaleminin TRY alış geçmişi; `units` ile çarpılır (10 gr bilezik = 10 × 22 ayar). */
export async function fetchHasfiyatHistory(
  title: string,
  units: number,
  timeframe: Timeframe,
  now = Date.now(),
): Promise<CandlePoint[]> {
  const { period } = PLAN[timeframe];
  const query = new URLSearchParams({ symbol: title, period, from: istanbulDate.format(now - FETCH_DAYS[period] * DAY_MS) });
  const { points } = await fetchSeries(`${ENDPOINT}?${query}`, HISTORY_TTL_S[period]);
  const since = now - TIMEFRAME_SPAN_MS[timeframe];
  const inRange = points.filter((p) => p.t >= since).map((p) => ({ t: p.t, v: p.v * units }));
  const filled =
    period === '1d' && inRange.length && inRange[0].t - since > GAP_TOLERANCE_MS
      ? await prependBackfill(title, inRange, since)
      : inRange;
  return downsample(filled, MAX_POINTS);
}

/**
 * Hasfiyat'ın günlük geçmişi başlamadan önceki günleri uluslararası piyasa verisinden tamamlar.
 * Tamamlama serisi, Hasfiyat serisinin ilk noktasındaki seviyeye ölçeklenir (Harem fiyatı spot
 * fiyattan farklıdır); böylece birleşim yerinde sıçrama olmaz. Ulaşılamazsa seri olduğu gibi kalır.
 */
async function prependBackfill(title: string, series: CandlePoint[], since: number): Promise<CandlePoint[]> {
  try {
    const id = BACKFILL_SERIES[title] ?? 'gold';
    const { points } = await fetchSeries(`${LONG_ENDPOINT}?series=${id}`, HISTORY_LONG_TTL_S);
    const first = series[0];
    const older = points.filter((p) => p.t >= since && p.t < first.t);
    const anchor = [...points].reverse().find((p) => p.t <= first.t) ?? points[0];
    if (!older.length || !anchor) return series;
    const factor = first.v / anchor.v;
    if (!Number.isFinite(factor) || factor <= 0) return series;
    return [...older.map((p) => ({ t: p.t, v: p.v * factor })), ...series];
  } catch {
    return series;
  }
}
