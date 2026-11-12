import { COMMUNITY_HASHTAGS, type CommunityHashtag } from '@/src/core/constants/hashtags';
import { CommunityPostKind } from '@/src/domain/enums';

export const COMMUNITY_KIND_LABELS: Record<CommunityPostKind, string> = {
  [CommunityPostKind.Tweet]: 'Tweet',
  [CommunityPostKind.Blog]: 'Blog',
  [CommunityPostKind.Article]: 'Yazı',
  [CommunityPostKind.Post]: 'Gönderi',
  [CommunityPostKind.News]: 'Haber',
};

/**
 * Hashtag'in kaynaklardaki arama karşılığı. Tek kelimelik genel aramalar
 * ("altın", "gümüş") alakasız içerik getirdiği için belirli ifadeler kullanılır.
 */
export type CommunityTopicQuery = {
  tag?: string;
  social: string[];
};

const TOPIC_QUERIES: Record<CommunityHashtag, Omit<CommunityTopicQuery, 'tag'>> = {
  '#Altın': {
    social: ['gram altın', 'ons altın', 'altın fiyatları'],
  },
  '#XAUUSD': { social: ['ons altın', 'xauusd'] },
  '#Gümüş': {
    // Düz "gümüş" araması takı gönderileri getirir; piyasa içeriği hashtag'de.
    social: ['gram gümüş', 'gümüş fiyatları', '#gümüş'],
  },
  '#GramAltın': { social: ['gram altın'] },
  '#ÇeyrekAltın': { social: ['çeyrek altın'] },
};

const ALL_TOPICS: CommunityTopicQuery = {
  social: ['gram altın', 'ons altın', 'gram gümüş', 'gümüş fiyatları'],
};

/**
 * Uygulama yalnızca altın ve gümüşü kapsar: bu ifadelerden birini içermeyen
 * içerik (ör. yalnızca petrol haberi, bilinmeyen hashtag sonuçları) akışa alınmaz.
 * "altına"/"altında" hem "altın" hem "alt" (aşağı) anlamına geldiği için yalnızca
 * belirsiz olmayan ekler kabul edilir ("100 liranın altına geriledi" elenir).
 */
const GOLD_TERMS = /(?<!\p{L})(?:altın(?:ın|lar\p{L}*|la)?|altin|xau(?:usd)?)(?!\p{L})/u;
const SILVER_TERMS = /(?<!\p{L})(?:gümüş\p{L}*|gumus|xag(?:usd)?)(?!\p{L})/u;

/** Metin belirli bir metalden bahsediyor mu (cümle bazlı ton analizi için). */
export function mentionsMetal(text: string, topic: 'gold' | 'silver'): boolean {
  return (topic === 'gold' ? GOLD_TERMS : SILVER_TERMS).test(text.toLocaleLowerCase('tr'));
}

export function isGoldOrSilverRelated(text: string): boolean {
  const lower = text.toLocaleLowerCase('tr');
  return GOLD_TERMS.test(lower) || SILVER_TERMS.test(lower);
}

/**
 * Yayıncıların kendi RSS/Atom akışları. Genel ekonomi akışlarıdır; altın/gümüş
 * içeriği alaka filtresiyle ayıklanır. Yayından önce her sitenin kullanım şartları
 * (başlık + bağlantı gösterimi) kontrol edilmelidir.
 */
export const PUBLISHER_FEEDS: { name: string; url: string }[] = [
  { name: 'Investing.com Türkiye', url: 'https://tr.investing.com/rss/news_11.rss' },
  { name: 'TRT Haber', url: 'https://www.trthaber.com/ekonomi_articles.rss' },
  { name: 'Hürriyet', url: 'https://www.hurriyet.com.tr/rss/ekonomi' },
  { name: 'Dünya', url: 'https://www.dunya.com/rss' },
  { name: 'Anadolu Ajansı', url: 'https://www.aa.com.tr/tr/rss/default?cat=ekonomi' },
  { name: 'Bloomberg HT', url: 'https://www.bloomberght.com/rss' },
];

/** Akış yalnızca bugünü gösterir: cihazın yerel saatine göre gece yarısından itibaren. */
export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** Gün değişimini algılamak için "2026-11-09". */
export function dayKey(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export type CommunityTopic = 'gold' | 'silver';

/** Topluluk sekmesindeki iki alan; her biri bir hashtag'in arama ifadelerini kullanır. */
export const COMMUNITY_TOPICS: { id: CommunityTopic; label: string; hashtag: CommunityHashtag }[] = [
  { id: 'gold', label: 'Altın', hashtag: '#Altın' },
  { id: 'silver', label: 'Gümüş', hashtag: '#Gümüş' },
];

/**
 * Alanına ait mi: Gümüş alanında yalnızca altından bahseden haber görünmez (ve tersi).
 * Konu bilinmiyorsa altın ya da gümüş geçmesi yeterli.
 */
export function matchesCommunityTag(text: string, tag?: string): boolean {
  const lower = text.toLocaleLowerCase('tr');
  if (tag === '#Gümüş') return SILVER_TERMS.test(lower);
  if (tag && ['#Altın', '#XAUUSD', '#GramAltın', '#ÇeyrekAltın'].includes(tag)) {
    return GOLD_TERMS.test(lower);
  }
  return GOLD_TERMS.test(lower) || SILVER_TERMS.test(lower);
}

/** Bilinmeyen hashtag'ler (gönderilerden gelenler) olduğu gibi aranır. */
export function communityTopicQuery(hashtag?: string): CommunityTopicQuery {
  if (!hashtag) return ALL_TOPICS;
  const key = hashtag.toLocaleLowerCase('tr');
  const known = COMMUNITY_HASHTAGS.find((tag) => tag.toLocaleLowerCase('tr') === key);
  if (known) return { tag: known, ...TOPIC_QUERIES[known] };
  const term = hashtag.replace(/^#/, '');
  return { tag: hashtag, social: [term] };
}
