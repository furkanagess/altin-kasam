/**
 * Hasfiyat istemcisi (yalnızca sunucu): API anahtarı `HASFIYAT_API_KEY` ortam değişkeninde durur,
 * istemci paketine girmez. Yanıt düz sayılara çevrilir ve kısa süre önbellekte tutulur; `/api/prices`
 * ve `/api/alarm-values` aynı önbelleği paylaşır, böylece Hasfiyat REST kotası tek yerden harcanır.
 */

import { PRICES_ERROR_BACKOFF_S, PRICES_TTL_CLOSED_S, PRICES_TTL_OPEN_S } from '@/src/core/constants/hasfiyatCache';
import type { HasfiyatItem, HasfiyatPricesResponse } from '@/src/data/datasources/hasfiyatTypes';
import { isMarketClosed } from '@/src/utils/marketHours';

const UPSTREAM = 'https://api.hasfiyat.com/api/prices';
const SOURCE = 'harem';
const TIMEOUT_MS = 8_000;

type UpstreamItem = Record<string, unknown> & { title?: string; buy?: unknown; sell?: unknown };

export type UpstreamResponse = {
  source?: string;
  data?: UpstreamItem[];
  stale?: boolean | null;
  lastUpdate?: string | null;
};

/** Piyasa kapalıyken fiyat değişmez; önbellek süresi uzar. */
export function pricesTtlSeconds(now = Date.now()): number {
  return isMarketClosed(now) ? PRICES_TTL_CLOSED_S : PRICES_TTL_OPEN_S;
}

/** Son hata; kısa süre aynen döner, Hasfiyat'a yeniden gidilmez. */
let failure: { at: number; result: Extract<PricesResult, { ok: false }> } | null = null;

let cache: { at: number; body: HasfiyatPricesResponse } | null = null;

/**
 * Metin fiyatlar her zaman Türkçe biçimlidir: nokta binlik, virgül ondalık ayırıcı
 * ("6.584,13", "10.687" = on bin altı yüz seksen yedi). `stats` içindeki değerler düz sayıdır.
 */
function parseTrNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  return Number(value.replace(/[^\d,-]/g, '').replace(',', '.'));
}

type SideValues = { buy?: number };
type UpstreamStats = {
  changePercent?: SideValues;
  previousClose?: SideValues;
  open?: SideValues;
  high?: SideValues;
  low?: SideValues;
};

const positive = (value: unknown): value is number => typeof value === 'number' && value > 0;

/** `stats=1` yalnızca Harem kalemlerinde gelir; türetilmiş kalemlerde (GRAM ALTIN) `null`dır. */
function readDay(item: UpstreamItem): HasfiyatItem['day'] {
  const stats = item.stats as UpstreamStats | null | undefined;
  const open = stats?.open?.buy;
  const high = stats?.high?.buy;
  const low = stats?.low?.buy;
  const previousClose = stats?.previousClose?.buy;
  if (!positive(open) || !positive(high) || !positive(low) || !positive(previousClose)) return null;
  return { open, high, low, previousClose };
}

function readChangePercent(item: UpstreamItem, bid: number): number | null {
  const stats = item.stats as UpstreamStats | null | undefined;
  const direct = stats?.changePercent?.buy;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  const previous = stats?.previousClose?.buy;
  if (typeof previous === 'number' && previous > 0) return Math.round(((bid - previous) / previous) * 10_000) / 100;
  return null;
}

function normalize(data: UpstreamResponse): HasfiyatPricesResponse {
  const items: HasfiyatItem[] = [];
  for (const item of data.data ?? []) {
    const bid = parseTrNumber(item.buy);
    const ask = parseTrNumber(item.sell);
    if (!item.title || !(bid > 0) || !(ask > 0)) continue;
    items.push({
      title: item.title,
      bid,
      ask,
      changePercent: readChangePercent(item, bid),
      day: readDay(item),
    });
  }
  return {
    source: data.source ?? SOURCE,
    lastUpdate: data.lastUpdate ?? null,
    stale: data.stale === true,
    items,
  };
}

export type PricesResult =
  | { ok: true; body: HasfiyatPricesResponse; raw?: UpstreamResponse }
  | { ok: false; status: number; error: string; reason?: string | null };

function remember(result: Extract<PricesResult, { ok: false }>): PricesResult {
  failure = { at: Date.now(), result };
  return result;
}

/** Önbellekteki ya da Hasfiyat'tan alınan güncel fiyatlar; `raw` yalnızca geliştirmede kalem adlarını görmek içindir. */
export async function loadPrices(wantsRaw = false): Promise<PricesResult> {
  const key = process.env.HASFIYAT_API_KEY;
  if (!key) return { ok: false, status: 503, error: 'not_configured' };
  if (!wantsRaw && cache && Date.now() - cache.at < pricesTtlSeconds() * 1000) return { ok: true, body: cache.body };
  if (!wantsRaw && failure && Date.now() - failure.at < PRICES_ERROR_BACKOFF_S * 1000) return failure.result;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Hasfiyat REST kotasından düşen gerçek istek; sayım için günlüğe yazılır.
    console.log('[hasfiyat] upstream prices');
    const res = await fetch(`${UPSTREAM}?source=${SOURCE}&stats=1&turetilmis=1`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { reason?: string } | null;
      return remember({ ok: false, status: 502, error: 'upstream', reason: detail?.reason ?? null });
    }
    const data = (await res.json()) as UpstreamResponse;
    const body = normalize(data);
    if (wantsRaw) return { ok: true, body, raw: data };
    if (!body.items.length) return remember({ ok: false, status: 502, error: 'empty' });
    cache = { at: Date.now(), body };
    failure = null;
    return { ok: true, body };
  } catch {
    return remember({ ok: false, status: 504, error: 'unreachable' });
  } finally {
    clearTimeout(timeout);
  }
}
