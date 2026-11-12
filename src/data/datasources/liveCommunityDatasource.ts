import {
  communityTopicQuery,
  matchesCommunityTag,
  startOfToday,
} from '@/src/core/constants/community';
import { COMMUNITY_HASHTAGS } from '@/src/core/constants/hashtags';
import { BlueskyCommunitySource } from '@/src/data/datasources/blueskyCommunitySource';
import type {
  ICommunityDatasource,
  ICommunitySource,
} from '@/src/data/datasources/communityDatasource';
import { PublisherRssCommunitySource } from '@/src/data/datasources/publisherRssCommunitySource';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';

/**
 * Haber botları aynı içeriği art arda paylaştığı için gönderilerde hesap başına sıkı sınır;
 * yayıncı RSS'lerinde aynı sitenin birden çok gerçek haberi olabildiği için daha geniş.
 */
const MAX_PER_AUTHOR = 2;
const MAX_PER_PUBLISHER = 4;
const MAX_POSTS = 60;
const MIN_TEXT_LENGTH = 20;

/**
 * Bağlantı ve hashtag'ler çıkarılmış ilk kelimeler: aynı haberin farklı paylaşımlarını yakalar.
 * Başlık varsa yalnızca başlık: yayıncı RSS'i başlık + özet verir, özetler aynı haberde farklı olabilir.
 */
function dedupeKey(post: CommunityPost): string {
  return (post.title || post.body)
    .toLocaleLowerCase('tr')
    .replace(/https?:\/\/\S+|www\.\S+/g, '')
    .replace(/#[\p{L}\p{N}_]+/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 60);
}

function curate(posts: CommunityPost[], tag?: string): CommunityPost[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const perAuthor = new Map<string, number>();
  const result: CommunityPost[] = [];
  const newestFirst = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  // Kaynaklar farklı aralıklar döndürür; akış yalnızca bugünü gösterir.
  const today = startOfToday();
  for (const post of newestFirst) {
    if (Date.parse(post.publishedAt) < today) continue;
    const key = dedupeKey(post);
    const count = perAuthor.get(post.author) ?? 0;
    if (seenIds.has(post.id) || seenKeys.has(key) || key.length < MIN_TEXT_LENGTH) continue;
    if (!matchesCommunityTag(`${post.title ?? ''} ${post.body} ${post.hashtags.join(' ')}`, tag)) continue;
    if (count >= (post.kind === CommunityPostKind.News ? MAX_PER_PUBLISHER : MAX_PER_AUTHOR)) continue;
    seenIds.add(post.id);
    seenKeys.add(key);
    perAuthor.set(post.author, count + 1);
    result.push(post);
    if (result.length >= MAX_POSTS) break;
  }
  return result;
}

/** Kaynaklardan biri düşerse akış diğerleriyle devam eder. */
export class LiveCommunityDatasource implements ICommunityDatasource {
  private readonly cache = new Map<string, CommunityPost>();

  constructor(
    // Google Haberler RSS'i yalnızca kişisel, ticari olmayan kullanım için açık; kaynak değildir.
    private readonly sources: ICommunitySource[] = [new BlueskyCommunitySource(), new PublisherRssCommunitySource()],
  ) {}

  async fetchPosts(hashtag?: string): Promise<CommunityPost[]> {
    const query = communityTopicQuery(hashtag);
    const results = await Promise.allSettled(this.sources.map((s) => s.search(query)));
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    if (!fulfilled.length) {
      throw (results[0] as PromiseRejectedResult | undefined)?.reason ?? new Error('Topluluk kaynaklarına ulaşılamadı');
    }
    const posts = curate(fulfilled.flatMap((r) => r.value), query.tag);
    for (const post of posts) this.cache.set(post.id, post);
    return posts;
  }

  async fetchPost(id: string): Promise<CommunityPost | null> {
    return this.cache.get(id) ?? null;
  }

  listHashtags(): string[] {
    return [...COMMUNITY_HASHTAGS];
  }
}
