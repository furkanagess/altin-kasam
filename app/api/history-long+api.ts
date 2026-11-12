/**
 * Uzun dönem (3A/1Y) geçmiş tamamlama ucu. Hasfiyat günlük barları yalnızca 4 Ekim 2026'dan beri
 * tuttuğu için, öncesi Yahoo Finance günlük kapanışlarından hesaplanır ve istemcide Hasfiyat
 * serisinin seviyesine hizalanır. Bu seriler yaklaşıktır (vadeli işlem fiyatı × kur), birebir
 * Harem fiyatı değildir.
 */

import { cdnCacheHeaders, HISTORY_LONG_TTL_S, NO_STORE_HEADERS } from '@/src/core/constants/hasfiyatCache';
import type { HasfiyatHistoryResponse } from '@/src/data/datasources/hasfiyatTypes';
import { usdPerOunceToTryPerGram } from '@/src/utils/metal';

const UPSTREAM = 'https://query1.finance.yahoo.com/v8/finance/chart';
const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = HISTORY_LONG_TTL_S * 1000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AltinKasam/1.0)';

type Point = { t: number; v: number };
type SeriesId = 'gold' | 'silver' | 'platinum' | 'palladium' | 'usd' | 'eur';

/** Tek Yahoo sembolü ya da "ons fiyatı × USD/TRY" ile gram TL. */
const SERIES: Record<SeriesId, { symbol: string; convert: 'none' | 'gramTry' }> = {
  gold: { symbol: 'GC=F', convert: 'gramTry' },
  silver: { symbol: 'SI=F', convert: 'gramTry' },
  platinum: { symbol: 'PL=F', convert: 'none' },
  palladium: { symbol: 'PA=F', convert: 'none' },
  usd: { symbol: 'USDTRY=X', convert: 'none' },
  eur: { symbol: 'EURTRY=X', convert: 'none' },
};

const cache = new Map<SeriesId, { at: number; body: HasfiyatHistoryResponse }>();

const isSeries = (value: string | null): value is SeriesId => !!value && value in SERIES;

async function fetchDaily(symbol: string): Promise<Point[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${UPSTREAM}/${encodeURIComponent(symbol)}?range=2y&interval=1d`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
    };
    const result = json.chart?.result?.[0];
    const times = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    return times.flatMap((t, i) => {
      const v = closes[i];
      return typeof v === 'number' && v > 0 ? [{ t: t * 1000, v }] : [];
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** `t` anında ya da hemen öncesindeki değer; seri başlamadan önce ilk değer. */
function lookup(series: Point[]): (t: number) => number {
  let index = 0;
  return (t) => {
    while (index + 1 < series.length && series[index + 1].t <= t) index += 1;
    return series[index].v;
  };
}

async function build(id: SeriesId): Promise<HasfiyatHistoryResponse> {
  const spec = SERIES[id];
  const base = await fetchDaily(spec.symbol);
  if (spec.convert === 'none') return { points: base };
  const fx = await fetchDaily(SERIES.usd.symbol);
  if (!fx.length) return { points: [] };
  const rate = lookup(fx);
  return { points: base.map((p) => ({ t: p.t, v: usdPerOunceToTryPerGram(p.v, rate(p.t)) })) };
}

export async function GET(request: Request): Promise<Response> {
  const series = new URL(request.url).searchParams.get('series');
  if (!isSeries(series)) return Response.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE_HEADERS });
  const cached = cache.get(series);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return Response.json(cached.body, { headers: cdnCacheHeaders(HISTORY_LONG_TTL_S) });
  try {
    const body = await build(series);
    if (!body.points.length) return Response.json({ error: 'empty' }, { status: 502, headers: NO_STORE_HEADERS });
    cache.set(series, { at: Date.now(), body });
    return Response.json(body, { headers: cdnCacheHeaders(HISTORY_LONG_TTL_S) });
  } catch {
    // Kaynak düşerse eski önbellek varsa o verilir.
    return cached
      ? Response.json(cached.body, { headers: cdnCacheHeaders(HISTORY_LONG_TTL_S) })
      : Response.json({ error: 'unreachable' }, { status: 504, headers: NO_STORE_HEADERS });
  }
}
