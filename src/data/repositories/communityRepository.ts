import {
  MockCommunityDatasource,
  type ICommunityDatasource,
} from '@/src/data/datasources/mockCommunityDatasource';
import type { CommunityPost } from '@/src/domain/models';

export class CommunityRepository {
  constructor(
    private readonly datasource: ICommunityDatasource = new MockCommunityDatasource(),
  ) {}

  listHashtags(): string[] {
    return this.datasource.listHashtags();
  }

  async getFeed(hashtag?: string): Promise<CommunityPost[]> {
    return this.datasource.fetchPosts(hashtag);
  }

  async getPost(id: string): Promise<CommunityPost | null> {
    return this.datasource.fetchPost(id);
  }
}

export const communityRepository = new CommunityRepository();
