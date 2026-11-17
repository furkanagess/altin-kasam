/**
 * Hasfiyat REST kotasını koruyan önbellek süreleri (saniye). Sunucu uçları yanıtları Expo Hosting
 * CDN'inde (`CDN-Cache-Control`) tutar: aynı adrese gelen bütün istemciler tek yanıtı paylaşır,
 * Hasfiyat'a giden istek istemci sayısına değil süreye bağlı kalır. Ayrıntı: docs/HASFIYAT_REST_ISTEKLERI.md
 */

/** Anlık fiyatlar; istemci yoklama aralığıyla (`POLL_INTERVAL_MS`) aynı tutulur. */
export const PRICES_TTL_OPEN_S = 20;
/** Hasfiyat hata verirse bu süre boyunca yeniden denenmez (kesintide istemci yoklamaları kotayı yakmasın). */
export const PRICES_ERROR_BACKOFF_S = 10;
/** Piyasa kapalıyken (`isMarketClosed`) fiyat değişmez. */
export const PRICES_TTL_CLOSED_S = 300;

/** Saatlik ve günlük geçmiş çubukları; çubuk saatte / günde bir kapanır, son nokta canlı fiyatla güncellenir. */
export const HISTORY_TTL_S = { '1h': 1800, '1d': 21600 } as const;

/** Yahoo tabanlı uzun dönem tamamlama (Hasfiyat kotasına girmez ama aynı mantıkla önbelleklenir). */
export const HISTORY_LONG_TTL_S = 6 * 60 * 60;

/** Hata anında CDN'in eski yanıtı vermeye devam edeceği süre. */
const STALE_IF_ERROR_S = 3600;

/** Tarayıcı/uygulama önbelleğe almaz, yalnızca CDN tutar. */
export function cdnCacheHeaders(maxAgeS: number): Record<string, string> {
  return {
    'Cache-Control': 'no-store',
    'CDN-Cache-Control': `max-age=${maxAgeS}, stale-while-revalidate=${maxAgeS * 2}, stale-if-error=${STALE_IF_ERROR_S}`,
  };
}

/** Hata ve gizli yanıtlar hiçbir yerde önbelleğe alınmaz. */
export const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'CDN-Cache-Control': 'no-store',
};
