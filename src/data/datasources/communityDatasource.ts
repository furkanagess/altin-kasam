import type { CommunityTopicQuery } from '@/src/core/constants/community';
import type { CommunityPost } from '@/src/domain/models';

export interface ICommunityDatasource {
  fetchPosts(hashtag?: string): Promise<CommunityPost[]>;
  fetchPost(id: string): Promise<CommunityPost | null>;
  listHashtags(): string[];
}

/** Tek bir dış kaynak (sosyal ağ, haber akışı). */
export interface ICommunitySource {
  search(query: CommunityTopicQuery): Promise<CommunityPost[]>;
}
