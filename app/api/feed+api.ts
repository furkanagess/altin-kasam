/**
 * Yayıncı RSS vekili (web): tarayıcı yayıncı akışlarını CORS yüzünden doğrudan çekemez. Yalnızca
 * `PUBLISHER_FEEDS` listesindeki adresler çekilir (başka adres istenemez); yanıt XML olarak aynen
 * döner ve kısa süre önbellekte tutulur. Telefonda akışlar doğrudan çekilir, bu uç kullanılmaz.
 */

import { cdnCacheHeaders, NO_STORE_HEADERS } from '@/src/core/constants/hasfiyatCache';
import { PUBLISHER_FEEDS } from '@/src/core/constants/community';

const TIMEOUT_MS = 8_000;
const MAX_BYTES = 3_000_000;
const CACHE_TTL_MS = 5 * 60_000;
const CDN_TTL_S = 300;
const USER_AGENT = 'Mozilla/5.0 (compatible; AltinKasam/1.0; +https://altin-kasam.expo.app)';

const ALLOWED = new Set(PUBLISHER_FEEDS.map((feed) => feed.url));
const cache = new Map<string, { at: number; body: string }>();

const xml = (body: string, maxAgeS: number) =>
  new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', ...cdnCacheHeaders(maxAgeS) } });

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url).searchParams.get('url') ?? '';
  if (!ALLOWED.has(url)) return Response.json({ error: 'bad_request' }, { status: 400, headers: NO_STORE_HEADERS });

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return xml(cached.body, CDN_TTL_S);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.text();
    if (body.length > MAX_BYTES) throw new Error('too_large');
    cache.set(url, { at: Date.now(), body });
    return xml(body, CDN_TTL_S);
  } catch {
    // Kaynak düşerse eski önbellek varsa o verilir.
    return cached
      ? xml(cached.body, 30)
      : Response.json({ error: 'unreachable' }, { status: 502, headers: NO_STORE_HEADERS });
  } finally {
    clearTimeout(timeout);
  }
}
