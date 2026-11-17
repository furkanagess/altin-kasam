/**
 * Brent petrol (USD/varil) geçmişi. Hasfiyat'ta petrol kalemi olmadığı için Yahoo Finance'in
 * Brent vadeli işlem serisinden (`BZ=F`) gelir; anahtar gerekmez. Yanıt düz noktalardır ve CDN'de
 * paylaşılır, bu yüzden istemci sayısı Yahoo'ya giden istek sayısını artırmaz.
 */

import { cdnCacheHeaders, NO_STORE_HEADERS } from '@/src/core/constants/hasfiyatCache';
import type { HasfiyatHistoryResponse } from '@/src/data/datasources/hasfiyatTypes';

const UPSTREAM = 'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F';
const TIMEOUT_MS = 10_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AltinKasam/1.0)';

/** Periyot başına Yahoo aralığı/bar boyutu ve önbellek süresi (saniye). */
const PLAN = {
  '1D': { range: '1d', interval: '5m', ttl: 120 },
  '1W': { range: '5d', interval: '30m', ttl: 300 },
  '1M': { range: '1mo', interval: '1h', ttl: 600 },
  '3M': { range: '3mo', interval: '1d', ttl: 3600 },
  '1Y': { range: '1y', interval: '1d', ttl: 3600 },
} as const;

type Timeframe = keyof typeof PLAN;
type YahooResponse = {
  chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] };
};

const cache = new Map<Timeframe, { at: number; body: HasfiyatHistoryResponse }>();
const isTimeframe = (value: string | null): value is Timeframe => !!value && value in PLAN;

async function load(timeframe: Timeframe): Promise<HasfiyatHistoryResponse> {
  const { range, interval } = PLAN[timeframe];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${UPSTREAM}?range=${range}&interval=${interval}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = ((await res.json()) as YahooResponse).chart?.result?.[0];
    const times = result?.timestamp ?? [];
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const points = times.flatMap((t, i) => {
      const v = closes[i];
      return typeof v === 'number' && v > 0 ? [{ t: t * 1000, v }] : [];
    });
    return { points };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request): Promise<Response> {
  const timeframe = new URL(request.url).searchParams.get('timeframe');
  if (!isTimeframe(timeframe)) return Response.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE_HEADERS });

  const { ttl } = PLAN[timeframe];
  const cached = cache.get(timeframe);
  if (cached && Date.now() - cached.at < ttl * 1000) return Response.json(cached.body, { headers: cdnCacheHeaders(ttl) });
  try {
    const body = await load(timeframe);
    if (body.points.length < 2) return Response.json({ error: 'empty' }, { status: 502, headers: NO_STORE_HEADERS });
    cache.set(timeframe, { at: Date.now(), body });
    return Response.json(body, { headers: cdnCacheHeaders(ttl) });
  } catch {
    // Kaynak düşerse eski önbellek varsa o verilir.
    return cached
      ? Response.json(cached.body, { headers: cdnCacheHeaders(ttl) })
      : Response.json({ error: 'unreachable' }, { status: 504, headers: NO_STORE_HEADERS });
  }
}
