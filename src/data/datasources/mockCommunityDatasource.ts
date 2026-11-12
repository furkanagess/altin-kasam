import { COMMUNITY_HASHTAGS } from '@/src/core/constants/hashtags';
import type { ICommunityDatasource } from '@/src/data/datasources/communityDatasource';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';

const MOCK_POSTS: CommunityPost[] = [
  {
    id: 'p1',
    kind: CommunityPostKind.Tweet,
    body: 'Gram altın yeniden 4.800 bandını test ediyor. Kısa vadede volatilite yüksek kalabilir. #Altın #XAUUSD #GramAltın',
    author: '@piyasa_izci',
    hashtags: ['#Altın', '#XAUUSD', '#GramAltın'],
    source: 'Curated Mock',
    publishedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    likes: 128,
  },
  {
    id: 'p2',
    kind: CommunityPostKind.Blog,
    title: 'Çeyrek altın biriktirmenin psikolojisi',
    body: 'Küçük birimlerle düzenli alım, maliyet ortalamasını yumuşatır. Portföyünüzde tek forma bağlanmadan çeşitlendirmek de riski düşürür. #ÇeyrekAltın #Altın',
    author: 'Kasa Günlüğü',
    hashtags: ['#ÇeyrekAltın', '#Altın'],
    source: 'Curated Mock',
    publishedAt: new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
    likes: 64,
  },
  {
    id: 'p3',
    kind: CommunityPostKind.Article,
    title: 'Gümüş–altın oranı ne söylüyor?',
    body: 'Tarihsel gümüş/altın oranı zirveye yaklaştığında gümüş göreli ucuz kalabilir. Yine de tek göstergeyle pozisyon açmayın. #Gümüş #Altın #XAUUSD',
    author: 'Emtia Analiz',
    hashtags: ['#Gümüş', '#Altın', '#XAUUSD'],
    source: 'Curated Mock',
    publishedAt: new Date(Date.now() - 8 * 60 * 60_000).toISOString(),
    likes: 211,
  },
];

export class MockCommunityDatasource implements ICommunityDatasource {
  async fetchPosts(hashtag?: string): Promise<CommunityPost[]> {
    if (!hashtag) return [...MOCK_POSTS];
    return MOCK_POSTS.filter((p) =>
      p.hashtags.some((h) => h.toLowerCase() === hashtag.toLowerCase()),
    );
  }

  async fetchPost(id: string): Promise<CommunityPost | null> {
    return MOCK_POSTS.find((p) => p.id === id) ?? null;
  }

  listHashtags(): string[] {
    return [...COMMUNITY_HASHTAGS];
  }
}
