/**
 * Haber önizleme vekil ucu: haber sayfasını sunucuda çeker (tarayıcıda CORS engeli olmaz) ve
 * yalnızca yayıncının paylaşım önizlemesi için verdiği açıklamayı (`og:description`) döner.
 * Haber metni kopyalanmaz; tamamı yayıncının sitesinde okunur.
 */

import type { ArticleSummary } from '@/src/data/datasources/articleTypes';

const TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 2_000_000;
const CACHE_TTL_MS = 6 * 60 * 60_000;
const MAX_CACHE_ENTRIES = 300;
/** Bazı siteler masaüstü tarayıcı dışını engeller; mobil Safari kimliği en az sorun çıkarandır. */
const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const cache = new Map<string, { at: number; body: ArticleSummary }>();

/** İç ağ adreslerine istek atılmasını (SSRF) engeller; yalnızca dışarıdaki http(s) sunucular. */
function isAllowedUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith('[') ||
    !host.includes('.')
  ) {
    return null;
  }
  return url;
}

async function fetchText(url: string, init?: RequestInit): Promise<{ text: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      ...init,
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'tr-TR,tr;q=0.9', ...init?.headers },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return { text: text.slice(0, MAX_HTML_BYTES), finalUrl: res.url || url };
  } finally {
    clearTimeout(timeout);
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

const clean = (value: string) => decodeEntities(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function readMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      'i',
    );
    const match = html.match(pattern);
    const value = match?.[1] ?? match?.[2];
    if (value) return clean(value);
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  const raw = new URL(request.url).searchParams.get('url') ?? '';
  const target = isAllowedUrl(raw);
  if (!target) return Response.json({ error: 'bad_request' }, { status: 400 });

  const cached = cache.get(target.toString());
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return Response.json(cached.body);

  try {
    const { text: html, finalUrl } = await fetchText(target.toString());
    const body: ArticleSummary = {
      url: finalUrl,
      siteName: readMeta(html, ['og:site_name']),
      description: readMeta(html, ['og:description', 'twitter:description', 'description']),
    };
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value as string);
    cache.set(target.toString(), { at: Date.now(), body });
    return Response.json(body);
  } catch {
    return Response.json({ error: 'unreachable' }, { status: 502 });
  }
}
