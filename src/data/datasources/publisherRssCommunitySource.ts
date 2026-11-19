import {
  PUBLISHER_FEEDS,
  startOfToday,
  type CommunityTopicQuery,
} from '@/src/core/constants/community';
import type { ICommunitySource } from '@/src/data/datasources/communityDatasource';
import { fetchText } from '@/src/data/datasources/http';
import { hashId, parseFeed, type FeedItem } from '@/src/data/datasources/rss';
import { CommunityPostKind } from '@/src/domain/enums';
import { Platform } from 'react-native';
import type { CommunityPost } from '@/src/domain/models';

/** Altın ve gümüş akışları aynı dosyaları ister; tek indirme paylaşılır. */
const CACHE_TTL_MS = 5 * 60_000;
const SUMMARY_LENGTH = 220;

type Feed = (typeof PUBLISHER_FEEDS)[number];

/**
 * Etiket eklenmez: alaka filtresi etiketleri de taradığı için arama etiketi eklemek
 * genel ekonomi haberlerini filtreden geçirirdi.
 */
function toPost(item: FeedItem, feed: Feed): CommunityPost {
  const summary = item.summary && item.summary !== item.title ? item.summary : '';
  return {
    id: `rss_${hashId(item.link)}`,
    kind: CommunityPostKind.News,
    title: item.title,
    body: summary.length > SUMMARY_LENGTH ? `${summary.slice(0, SUMMARY_LENGTH).trimEnd()}…` : summary,
    author: feed.name,
    hashtags: [],
    source: feed.name,
    publishedAt: new Date(item.publishedAt).toISOString(),
    url: item.link,
  };
}

/**
 * Yayıncı akışlarının tamamını döndürür; konu ayrımı (altın/gümüş) ve tekrar
 * eleme `LiveCommunityDatasource` tarafında yapılır. Web'de akışlar `/api/feed` vekiliyle çekilir.
 */
export class PublisherRssCommunitySource implements ICommunitySource {
  private readonly cache = new Map<string, { at: number; items: Promise<FeedItem[]> }>();

  constructor(private readonly feeds: readonly Feed[] = PUBLISHER_FEEDS) {}

  private load(feed: Feed): Promise<FeedItem[]> {
    const cached = this.cache.get(feed.url);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.items;
    // Web'de tarayıcı CORS yüzünden akışı doğrudan çekemez; sunucu vekili kullanılır (`/api/feed`).
    const url = Platform.OS === 'web' ? `/api/feed?url=${encodeURIComponent(feed.url)}` : feed.url;
    const items = fetchText(url).then(parseFeed);
    this.cache.set(feed.url, { at: Date.now(), items });
    items.catch(() => {
      if (this.cache.get(feed.url)?.items === items) this.cache.delete(feed.url);
    });
    return items;
  }

  /** Konu (`query`) kullanılmaz: akışlar aranamaz, ayrım alaka filtresiyle yapılır. */
  async search(_query: CommunityTopicQuery): Promise<CommunityPost[]> {
    const results = await Promise.allSettled(
      this.feeds.map(async (feed) => (await this.load(feed)).map((item) => toPost(item, feed))),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    if (!fulfilled.length) {
      throw (results[0] as PromiseRejectedResult | undefined)?.reason ?? new Error('Haber akışlarına ulaşılamadı');
    }
    const oldest = startOfToday();
    return fulfilled.flatMap((r) => r.value).filter((p) => Date.parse(p.publishedAt) >= oldest);
  }
}
