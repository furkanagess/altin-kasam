/**
 * Hasfiyat REST kotasının son savunma hattı (yalnızca sunucu). Önbellek ve CDN normal trafiği
 * karşılar; bu modül ise önbelleği atlatan durumları sınırlar: rastgele parametreli istek seli,
 * kod hatasıyla oluşan döngü ya da Hasfiyat'ın kota/yetki hatası.
 *
 * - Bütçe: her işçi (isolate) dakikada en çok `UPSTREAM_BUDGET_PER_MIN` Hasfiyat isteği atar.
 *   Fiyatlar için ayrı pay ayrılır; geçmiş istekleri bütçeyi bitirse bile canlı fiyat güncellenir.
 * - Devre kesici: Hasfiyat 429 (kota) ya da 401/403 (anahtar) dönerse bir süre hiç istek atılmaz;
 *   `Retry-After` varsa ona uyulur. Bu sürede uçlar son iyi veriyi verir.
 */

import { UPSTREAM_AUTH_COOLDOWN_S, UPSTREAM_BUDGET_PER_MIN, UPSTREAM_PRICES_RESERVE, UPSTREAM_QUOTA_COOLDOWN_S } from '@/src/core/constants/hasfiyatCache';

export type UpstreamKind = 'prices' | 'history';

const WINDOW_MS = 60_000;
/** Son bir dakikadaki gerçek Hasfiyat isteklerinin zamanları. */
const recent: { at: number; kind: UpstreamKind }[] = [];
let blockedUntil = 0;

function prune(now: number) {
  while (recent.length && now - recent[0].at >= WINDOW_MS) recent.shift();
}

/**
 * Hasfiyat'a istek atılabilir mi; atılabiliyorsa sayılır. `false` dönerse çağıran Hasfiyat'a
 * gitmez, önbellekteki (eski de olsa) veriyi ya da hata yanıtını verir.
 */
export function acquireUpstream(kind: UpstreamKind, now = Date.now()): boolean {
  if (now < blockedUntil) return false;
  prune(now);
  // Geçmiş istekleri bütçenin fiyatlara ayrılan payına dokunamaz.
  const limit = kind === 'prices' ? UPSTREAM_BUDGET_PER_MIN : UPSTREAM_BUDGET_PER_MIN - UPSTREAM_PRICES_RESERVE;
  if (recent.length >= limit) {
    console.warn(`[hasfiyat] upstream budget exhausted (${kind})`);
    return false;
  }
  recent.push({ at: now, kind });
  return true;
}

/** Hasfiyat yanıtının durumuna göre devre kesiciyi açar. */
export function reportUpstreamStatus(status: number, retryAfter: string | null, now = Date.now()) {
  let cooldownS = 0;
  if (status === 429) cooldownS = parseRetryAfter(retryAfter, now) ?? UPSTREAM_QUOTA_COOLDOWN_S;
  else if (status === 401 || status === 403) cooldownS = UPSTREAM_AUTH_COOLDOWN_S;
  if (!cooldownS) return;
  blockedUntil = Math.max(blockedUntil, now + cooldownS * 1000);
  console.warn(`[hasfiyat] upstream ${status}; paused for ${cooldownS}s`);
}

/** Devre kesici açıksa kalan süre (sn); kapalıysa 0. */
export function upstreamPausedFor(now = Date.now()): number {
  return blockedUntil > now ? Math.ceil((blockedUntil - now) / 1000) : 0;
}

/** Saniye ya da HTTP tarihi; makul olmayan değerler (≤0, 1 saatten uzun) sınırlanır. */
function parseRetryAfter(value: string | null, now: number): number | null {
  if (!value) return null;
  const seconds = /^\d+$/.test(value.trim()) ? Number(value) : (Date.parse(value) - now) / 1000;
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.min(Math.ceil(seconds), 3600);
}
