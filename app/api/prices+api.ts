/**
 * Hasfiyat vekil ucu: API anahtarı yalnızca sunucuda durur (bkz. `src/server/hasfiyatPrices.ts`).
 * Yanıt düz sayılardır ve Expo Hosting CDN'inde `pricesTtlSeconds` kadar tutulur: aynı anda açık
 * bütün istemciler tek yanıtı paylaşır, Hasfiyat REST kotası istemci sayısıyla artmaz.
 */

import { cdnCacheHeaders, NO_STORE_HEADERS } from '@/src/core/constants/hasfiyatCache';
import { loadPrices, pricesTtlSeconds } from '@/src/server/hasfiyatPrices';

export async function GET(request: Request): Promise<Response> {
  // Geliştirmede kalem adlarını görmek için: /api/prices?raw=1 (üretimde kapalı).
  const wantsRaw =
    process.env.NODE_ENV !== 'production' && new URL(request.url).searchParams.get('raw') === '1';
  const result = await loadPrices(wantsRaw);
  if (!result.ok) {
    return Response.json(
      result.reason !== undefined
        ? { error: result.error, status: 502, reason: result.reason }
        : { error: result.error },
      { status: result.status, headers: NO_STORE_HEADERS },
    );
  }
  if (wantsRaw && result.raw) return Response.json(result.raw, { headers: NO_STORE_HEADERS });
  return Response.json(result.body, { headers: cdnCacheHeaders(pricesTtlSeconds()) });
}
