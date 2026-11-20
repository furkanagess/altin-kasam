/**
 * Hasfiyat (Harem) OHLC geçmişi vekil ucu: anahtar yalnızca sunucuda durur. Alış kapanışları
 * düz noktalar olarak döner; aynı istek kısa süre önbellekten verilir (REST kotası).
 *
 * Kota koruması: sembol beyaz listeden olmalı, `from` sunucuda periyoda göre hesaplanır (istemcinin
 * gönderdiği tarih yok sayılır), hata veren seri bir süre yeniden denenmez ve her Hasfiyat isteği
 * `upstreamGuard` bütçesinden düşer. Böylece rastgele parametrelerle önbellek atlatılamaz.
 */

import {
  cdnCacheHeaders,
  HISTORY_ERROR_BACKOFF_S,
  HISTORY_FETCH_DAYS,
  HISTORY_TTL_S,
  NO_STORE_HEADERS,
} from '@/src/core/constants/hasfiyatCache';
import { HISTORY_TITLES, normalizeTitle } from '@/src/core/constants/hasfiyatPriceMap';
import type { HasfiyatHistoryResponse } from '@/src/data/datasources/hasfiyatTypes';
import { cachedTitles } from '@/src/server/hasfiyatPrices';
import { acquireUpstream, reportUpstreamStatus, upstreamPausedFor } from '@/src/server/upstreamGuard';

const UPSTREAM = 'https://api.hasfiyat.com/api/prices/history';
const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = { '1h': HISTORY_TTL_S['1h'] * 1000, '1d': HISTORY_TTL_S['1d'] * 1000 } as const;
/** Beyaz liste ve sabit `from` ile anahtar sayısı ~25 kalem × 2 periyottur; bu tavan yalnızca güvencedir. */
const MAX_CACHE_ENTRIES = 120;
/** Kaynak hata verdiğinde eski veriyle dönülen yanıtın CDN süresi (sn). */
const STALE_TTL_S = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type Period = keyof typeof CACHE_TTL_MS;
type UpstreamBar = { ts?: number; close?: number; buy?: { close?: number } };

const cache = new Map<string, { at: number; body: HasfiyatHistoryResponse }>();
/** Son hata; `HISTORY_ERROR_BACKOFF_S` boyunca aynı seri için Hasfiyat'a gidilmez. */
const failures = new Map<string, { at: number; status: number; error: Record<string, unknown> }>();
/** Aynı anahtar için süren istek varsa yenisi açılmaz (önbellek süresi dolduğu anda gelen yığılma). */
type Loaded = { ok: true; body: HasfiyatHistoryResponse } | { ok: false; status: number; error: Record<string, unknown> };
const inflight = new Map<string, Promise<Loaded>>();

const isPeriod = (value: string | null): value is Period => value === '1h' || value === '1d';
const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
const istanbulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' });
const ALLOWED = new Map(HISTORY_TITLES.map((title) => [normalizeTitle(title), title]));

/** Bilinen kalem adı (yazım farkları tek ada indirgenir); bilinmiyorsa `null`. */
function canonicalSymbol(raw: string): string | null {
  const normalized = normalizeTitle(raw);
  if (!normalized) return null;
  const known = ALLOWED.get(normalized);
  if (known) return known;
  // Yeni bir Harem kalemi: yalnızca son fiyat listesinde varsa kabul edilir.
  return cachedTitles().find((title) => normalizeTitle(title) === normalized) ?? null;
}

/** Periyodun tek `from` değeri (İstanbul tarihi); bütün istemciler aynı anahtarı paylaşır. */
function canonicalFrom(period: Period, now = Date.now()): string {
  return istanbulDate.format(now - HISTORY_FETCH_DAYS[period] * DAY_MS);
}

/** Bayatlamış önbelleği de kısa CDN süresiyle verir; yoksa hata. */
function staleOr(cached: { body: HasfiyatHistoryResponse } | undefined, status: number, error: Record<string, unknown>) {
  if (cached) return Response.json(cached.body, { headers: cdnCacheHeaders(STALE_TTL_S) });
  return Response.json(error, { status, headers: NO_STORE_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  const key = process.env.HASFIYAT_API_KEY;
  if (!key) return Response.json({ error: 'not_configured' }, { status: 503, headers: NO_STORE_HEADERS });

  const params = new URL(request.url).searchParams;
  const rawSymbol = params.get('symbol')?.trim() ?? '';
  const period = params.get('period');
  const from = params.get('from');
  if (!rawSymbol || rawSymbol.length > 40 || !isPeriod(period) || (from !== null && !isDate(from))) {
    return Response.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const symbol = canonicalSymbol(rawSymbol);
  if (!symbol) return Response.json({ error: 'unknown_symbol' }, { status: 404, headers: NO_STORE_HEADERS });

  const fetchFrom = canonicalFrom(period);
  const cacheKey = `${symbol}|${period}|${fetchFrom}`;
  // Gün dönümünde anahtar değişir; önceki günün serisi yenisi gelene kadar yedek olarak kullanılır.
  const cached = cache.get(cacheKey) ?? latestFor(symbol, period);
  if (cached && cache.get(cacheKey) === cached && Date.now() - cached.at < CACHE_TTL_MS[period]) {
    return Response.json(cached.body, { headers: cdnCacheHeaders(HISTORY_TTL_S[period]) });
  }

  const failure = failures.get(cacheKey);
  if (failure && Date.now() - failure.at < HISTORY_ERROR_BACKOFF_S * 1000) {
    return staleOr(cached, failure.status, failure.error);
  }

  let pending = inflight.get(cacheKey);
  if (!pending) {
    if (!acquireUpstream('history')) {
      const retryAfter = upstreamPausedFor() || 30;
      if (cached) return Response.json(cached.body, { headers: cdnCacheHeaders(STALE_TTL_S) });
      return Response.json({ error: 'busy' }, { status: 429, headers: { ...NO_STORE_HEADERS, 'Retry-After': String(retryAfter) } });
    }
    pending = loadUpstream(key, symbol, period, fetchFrom, cacheKey).finally(() => inflight.delete(cacheKey));
    inflight.set(cacheKey, pending);
  }
  const result = await pending;
  if (!result.ok) {
    // Kaynak geçici olarak hata verirse süresi dolmuş da olsa son veri verilir (grafik boş kalmasın).
    // Kısa CDN süresiyle döner; kaynak düzelince bir sonraki istek taze veriyi alır.
    return staleOr(cached, result.status, result.error);
  }
  return Response.json(result.body, { headers: cdnCacheHeaders(HISTORY_TTL_S[period]) });
}

/** Aynı kalem ve periyodun en son önbelleklenen serisi (önceki günün `from` anahtarı dahil). */
function latestFor(symbol: string, period: Period): { at: number; body: HasfiyatHistoryResponse } | undefined {
  let best: { at: number; body: HasfiyatHistoryResponse } | undefined;
  const prefix = `${symbol}|${period}|`;
  for (const [k, entry] of cache) {
    if (k.startsWith(prefix) && (!best || entry.at > best.at)) best = entry;
  }
  return best;
}

function remember(cacheKey: string, loaded: Extract<Loaded, { ok: false }>): Loaded {
  if (failures.size >= MAX_CACHE_ENTRIES) failures.delete(failures.keys().next().value as string);
  failures.set(cacheKey, { at: Date.now(), status: loaded.status, error: loaded.error });
  return loaded;
}

async function loadUpstream(key: string, symbol: string, period: Period, from: string, cacheKey: string): Promise<Loaded> {
  const query = new URLSearchParams({ symbol, period, source: 'harem', from });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    console.log('[hasfiyat] upstream history');
    const res = await fetch(`${UPSTREAM}?${query}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      reportUpstreamStatus(res.status, res.headers.get('retry-after'));
      const detail = (await res.json().catch(() => null)) as { reason?: string } | null;
      return remember(cacheKey, { ok: false, status: 502, error: { error: 'upstream', status: res.status, reason: detail?.reason ?? null } });
    }
    const data = (await res.json()) as { data?: unknown };
    const bars = Array.isArray(data.data) ? (data.data as UpstreamBar[]) : [];
    const points = bars.flatMap((bar) => {
      const v = bar.buy?.close ?? bar.close;
      return typeof bar.ts === 'number' && typeof v === 'number' && v > 0 ? [{ t: bar.ts, v }] : [];
    });
    const body: HasfiyatHistoryResponse = { points };
    // Önceki günlerin anahtarları yer açmak için önce silinir (Map ekleme sırasını korur).
    cache.delete(cacheKey);
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, { at: Date.now(), body });
    failures.delete(cacheKey);
    return { ok: true, body };
  } catch {
    return remember(cacheKey, { ok: false, status: 504, error: { error: 'unreachable' } });
  } finally {
    clearTimeout(timeout);
  }
}
