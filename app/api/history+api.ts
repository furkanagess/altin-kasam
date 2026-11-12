/**
 * Hasfiyat (Harem) OHLC geçmişi vekil ucu: anahtar yalnızca sunucuda durur. Alış kapanışları
 * düz noktalar olarak döner; aynı istek kısa süre önbellekten verilir (REST kotası).
 */

import { cdnCacheHeaders, HISTORY_TTL_S, NO_STORE_HEADERS } from '@/src/core/constants/hasfiyatCache';
import type { HasfiyatHistoryResponse } from '@/src/data/datasources/hasfiyatTypes';

const UPSTREAM = 'https://api.hasfiyat.com/api/prices/history';
const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = { '1h': HISTORY_TTL_S['1h'] * 1000, '1d': HISTORY_TTL_S['1d'] * 1000 } as const;
const MAX_CACHE_ENTRIES = 200;

type Period = keyof typeof CACHE_TTL_MS;
type UpstreamBar = { ts?: number; close?: number; buy?: { close?: number } };

const cache = new Map<string, { at: number; body: HasfiyatHistoryResponse }>();

const isPeriod = (value: string | null): value is Period => value === '1h' || value === '1d';
const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request): Promise<Response> {
  const key = process.env.HASFIYAT_API_KEY;
  if (!key) return Response.json({ error: 'not_configured' }, { status: 503, headers: NO_STORE_HEADERS });

  const params = new URL(request.url).searchParams;
  const symbol = params.get('symbol')?.trim() ?? '';
  const period = params.get('period');
  const from = params.get('from');
  if (!symbol || symbol.length > 40 || !isPeriod(period) || (from !== null && !isDate(from))) {
    return Response.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const cacheKey = `${symbol}|${period}|${from ?? ''}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS[period]) {
    return Response.json(cached.body, { headers: cdnCacheHeaders(HISTORY_TTL_S[period]) });
  }

  const query = new URLSearchParams({ symbol, period, source: 'harem' });
  if (from) query.set('from', from);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    console.log('[hasfiyat] upstream history');
    const res = await fetch(`${UPSTREAM}?${query}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { reason?: string } | null;
      return Response.json({ error: 'upstream', status: res.status, reason: detail?.reason ?? null }, { status: 502, headers: NO_STORE_HEADERS });
    }
    const data = (await res.json()) as { data?: unknown };
    const bars = Array.isArray(data.data) ? (data.data as UpstreamBar[]) : [];
    const points = bars.flatMap((bar) => {
      const v = bar.buy?.close ?? bar.close;
      return typeof bar.ts === 'number' && typeof v === 'number' && v > 0 ? [{ t: bar.ts, v }] : [];
    });
    const body: HasfiyatHistoryResponse = { points };
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, { at: Date.now(), body });
    return Response.json(body, { headers: cdnCacheHeaders(HISTORY_TTL_S[period]) });
  } catch {
    return Response.json({ error: 'unreachable' }, { status: 504, headers: NO_STORE_HEADERS });
  } finally {
    clearTimeout(timeout);
  }
}
