/**
 * Arama motorları için site haritası (XML). Herkese açık, içerik ağırlıklı sayfalar listelenir:
 * ana bölümler, ekonomik takvim, her altın çeşidinin ve metalin detay sayfası. `public/robots.txt`
 * buraya işaret eder.
 */

import { GOLD_ASSETS } from '@/src/core/constants/goldAssets';
import { SITE_URL } from '@/src/core/web/seo';

const STATIC_PATHS = ['/', '/analytics', '/community', '/calendar', '/metal/XAU', '/metal/XAG'];

export function GET(): Response {
  const paths = [...STATIC_PATHS, ...GOLD_ASSETS.map((asset) => `/gold/${asset.id}`)];
  const urls = paths
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc><changefreq>hourly</changefreq></url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
