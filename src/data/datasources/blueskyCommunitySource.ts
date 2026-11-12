import { startOfToday, type CommunityTopicQuery } from '@/src/core/constants/community';
import type { ICommunitySource } from '@/src/data/datasources/communityDatasource';
import { fetchJson } from '@/src/data/datasources/http';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';

/** Anahtarsız AppView; `public.api.bsky.app` arama uç noktası 403 döndürüyor. */
const SEARCH_URL = 'https://api.bsky.app/xrpc/app.bsky.feed.searchPosts';
const LIMIT_PER_QUERY = 25;

type BskyFacet = { features?: { $type?: string; tag?: string }[] };

type BskyPost = {
  uri: string;
  author: { did: string; handle: string; displayName?: string };
  record: { text?: string; createdAt?: string; facets?: BskyFacet[] };
  likeCount?: number;
  indexedAt?: string;
};

const INLINE_TAG = /#[\p{L}\p{N}_]+/gu;

function searchUrl(term: string): string {
  const params = [
    `q=${encodeURIComponent(term)}`,
    // "top": aynı dönemde etkileşim alan gönderiler; "latest" büyük ölçüde haber botlarından oluşuyor.
    'sort=top',
    'lang=tr',
    `limit=${LIMIT_PER_QUERY}`,
  ];
  // Hashtag aramaları `since` ile InvalidRequest döndürüyor; onlarda süre sınırı istemcide uygulanır.
  if (!term.startsWith('#')) {
    params.push(`since=${new Date(startOfToday()).toISOString()}`);
  }
  return `${SEARCH_URL}?${params.join('&')}`;
}

function hashtagsOf(post: BskyPost): string[] {
  const fromFacets = (post.record.facets ?? [])
    .flatMap((f) => f.features ?? [])
    .filter((f) => f.$type === 'app.bsky.richtext.facet#tag' && f.tag)
    .map((f) => `#${f.tag}`);
  const tags = fromFacets.length ? fromFacets : (post.record.text?.match(INLINE_TAG) ?? []);
  return [...new Set(tags)];
}

function toCommunityPost(post: BskyPost): CommunityPost | null {
  const text = post.record.text?.trim();
  const rkey = post.uri.split('/').pop();
  if (!text || !rkey) return null;
  const created = Date.parse(post.record.createdAt ?? '');
  // createdAt istemci tarafından yazılır; gelecekteki/bozuk tarihler için indexlenme zamanı kullanılır.
  const publishedAt =
    Number.isFinite(created) && created <= Date.now()
      ? new Date(created).toISOString()
      : (post.indexedAt ?? new Date().toISOString());
  return {
    id: `bsky_${post.author.did.split(':').pop()}_${rkey}`,
    kind: CommunityPostKind.Post,
    body: text,
    author: post.author.displayName?.trim() || `@${post.author.handle}`,
    hashtags: hashtagsOf(post),
    source: 'Bluesky',
    publishedAt,
    likes: post.likeCount ?? 0,
    url: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
  };
}

export class BlueskyCommunitySource implements ICommunitySource {
  async search(query: CommunityTopicQuery): Promise<CommunityPost[]> {
    const results = await Promise.allSettled(
      query.social.map((term) => fetchJson<{ posts?: BskyPost[] }>(searchUrl(term))),
    );
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    if (!fulfilled.length) {
      throw (results[0] as PromiseRejectedResult | undefined)?.reason ?? new Error('Bluesky yanıt vermedi');
    }
    const oldest = startOfToday();
    return fulfilled
      .flatMap((r) => r.value.posts ?? [])
      .map(toCommunityPost)
      .filter((p): p is CommunityPost => p !== null && Date.parse(p.publishedAt) >= oldest);
  }
}
