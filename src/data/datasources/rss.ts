/** RSS 2.0 ve Atom akışları için hafif ayrıştırıcı (Hermes'te DOMParser yok). */

export type FeedItem = {
  title: string;
  link: string;
  publishedAt: number;
  /** HTML'den arındırılmış kısa açıklama. */
  summary?: string;
  /** RSS `<source>` (toplayıcı akışlarda yayıncı adı). */
  source?: string;
};

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** CDATA'yı açar, etiketleri atar, boşlukları sadeleştirir. */
function cleanText(raw: string): string {
  const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  const withoutTags = decodeEntities(unwrapped).replace(/<[^>]*>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/** Etiketin ilk içeriği (öznitelikli etiketler dahil); ad alanlı etiketler (`dc:date`) için de çalışır. */
function tagContent(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1];
}

function linkOf(block: string): string | undefined {
  const text = tagContent(block, 'link');
  if (text) {
    const cleaned = cleanText(text);
    if (cleaned) return cleaned;
  }
  // Atom: <link href="..." /> (varsa rel="alternate" tercih edilir).
  const links = [...block.matchAll(/<link\s[^>]*>/gi)].map((m) => m[0]);
  const alternate = links.find((l) => /rel=["']alternate["']/i.test(l)) ?? links.find((l) => !/rel=/i.test(l)) ?? links[0];
  return alternate?.match(/href=["']([^"']+)["']/i)?.[1];
}

function dateOf(block: string): number {
  const raw =
    tagContent(block, 'pubDate') ??
    tagContent(block, 'published') ??
    tagContent(block, 'updated') ??
    tagContent(block, 'dc:date');
  const time = raw ? Date.parse(cleanText(raw)) : NaN;
  return Number.isFinite(time) ? time : NaN;
}

/** Tarihsiz ya da başlıksız kayıtlar atlanır; tarihi gelecekteki kayıtlar şimdiye çekilir. */
export function parseFeed(xml: string): FeedItem[] {
  const blocks = [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map((m) => m[2]);
  const now = Date.now();
  const items: FeedItem[] = [];
  for (const block of blocks) {
    const title = cleanText(tagContent(block, 'title') ?? '');
    const link = linkOf(block);
    const published = dateOf(block);
    if (!title || !link || Number.isNaN(published)) continue;
    const summaryRaw =
      tagContent(block, 'description') ?? tagContent(block, 'summary') ?? tagContent(block, 'content:encoded');
    const summary = summaryRaw ? cleanText(summaryRaw) : undefined;
    const source = tagContent(block, 'source');
    items.push({
      title,
      link,
      publishedAt: Math.min(published, now),
      summary: summary || undefined,
      source: source ? cleanText(source) : undefined,
    });
  }
  return items;
}

/** Bağlantıdan kısa, kararlı bir kimlik (djb2). */
export function hashId(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
