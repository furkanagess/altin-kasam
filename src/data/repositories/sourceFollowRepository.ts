import { storageGet, storageSet } from '@/src/core/storage/storage';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';

const FOLLOWS_KEY = 'altin_kasam_followed_sources_v1';
const NOTIFIED_KEY = 'altin_kasam_notified_news_v1';
/** Bildirilen haber kimlikleri sınırsız büyümesin; akış zaten yalnızca son günü içerir. */
const MAX_NOTIFIED = 300;

/** Takip edilen haber kaynağı (yayıncı adı) ve takibe başlanan an; öncesindeki haberler bildirilmez. */
export type SourceFollow = { name: string; since: string };

/** Haberin kaynağı yayıncıdır (RSS'te yayın adı). */
export function newsSourceOf(post: CommunityPost): string | null {
  return post.kind === CommunityPostKind.News ? post.author : null;
}

export class SourceFollowRepository {
  async listFollows(): Promise<SourceFollow[]> {
    return (await storageGet<SourceFollow[]>(FOLLOWS_KEY)) ?? [];
  }

  async follow(name: string): Promise<SourceFollow[]> {
    const follows = await this.listFollows();
    if (follows.some((f) => f.name === name)) return follows;
    const next = [...follows, { name, since: new Date().toISOString() }];
    await storageSet(FOLLOWS_KEY, next);
    return next;
  }

  async unfollow(name: string): Promise<SourceFollow[]> {
    const next = (await this.listFollows()).filter((f) => f.name !== name);
    await storageSet(FOLLOWS_KEY, next);
    return next;
  }

  async listNotified(): Promise<string[]> {
    return (await storageGet<string[]>(NOTIFIED_KEY)) ?? [];
  }

  async markNotified(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const next = [...new Set([...ids, ...(await this.listNotified())])].slice(0, MAX_NOTIFIED);
    await storageSet(NOTIFIED_KEY, next);
  }

  /** Takipten sonra yayımlanmış ve daha önce bildirilmemiş haberler, kaynağa göre gruplu. */
  fresh(posts: CommunityPost[], follows: SourceFollow[], notified: Set<string>): Map<string, CommunityPost[]> {
    const since = new Map(follows.map((f) => [f.name, f.since]));
    const groups = new Map<string, CommunityPost[]>();
    for (const post of posts) {
      const source = newsSourceOf(post);
      const followedAt = source ? since.get(source) : undefined;
      if (!source || !followedAt || notified.has(post.id) || post.publishedAt <= followedAt) continue;
      groups.set(source, [...(groups.get(source) ?? []), post]);
    }
    return groups;
  }
}

export const sourceFollowRepository = new SourceFollowRepository();
