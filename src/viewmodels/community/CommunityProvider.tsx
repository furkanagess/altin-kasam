import { COMMUNITY_TOPICS, dayKey, type CommunityTopic } from '@/src/core/constants/community';
import { userMessageForError } from '@/src/core/network/networkErrors';
import { networkMonitor } from '@/src/core/network/networkMonitor';
import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';
import { useNetworkRecovery } from '@/src/viewmodels/network/useNetworkStatus';
import { communityRepository } from '@/src/data/repositories/communityRepository';
import { readPostRepository } from '@/src/data/repositories/readPostRepository';
import {
  newsSourceOf,
  sourceFollowRepository,
  type SourceFollow,
} from '@/src/data/repositories/sourceFollowRepository';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

type LoadState = 'loading' | 'ready' | 'error';

export type TopicFeed = {
  state: LoadState;
  error: string | null;
  posts: CommunityPost[];
};

export type MetalFilter = 'all' | CommunityTopic;
export type KindFilter = 'all' | 'news' | 'post';
export type ReadFilter = 'all' | 'unread' | 'read';
export type FollowFilter = 'all' | 'followed' | 'unfollowed';

export type CommunityFeed = {
  state: LoadState;
  /** Önceki liste ekrandayken arka planda yenileniyor. */
  refreshing: boolean;
  error: string | null;
  posts: CommunityPost[];
};

type CommunityContextValue = {
  metal: MetalFilter;
  kind: KindFilter;
  setMetal: (metal: MetalFilter) => void;
  setKind: (kind: KindFilter) => void;
  read: ReadFilter;
  follow: FollowFilter;
  setRead: (read: ReadFilter) => void;
  setFollow: (follow: FollowFilter) => void;
  resetFilters: () => void;
  /** Filtre uygulanmış akış. */
  feed: CommunityFeed;
  /** Her seçeneğin, diğer gruptaki mevcut seçimle birlikte getireceği içerik sayısı. */
  filterCounts: {
    metal: Record<MetalFilter, number>;
    kind: Record<KindFilter, number>;
    read: Record<ReadFilter, number>;
    follow: Record<FollowFilter, number>;
  };
  /** Filtresiz altın ve gümüş akışları (piyasa beklentisi analizi için). */
  topicFeeds: Record<CommunityTopic, TopicFeed>;
  refresh: () => Promise<void>;
  getPost: (id: string) => Promise<CommunityPost | null>;
  /** Takip edilen haber kaynakları (yayıncı adları); bu kaynakların haberleri akışta önce gelir. */
  followedSources: ReadonlySet<string>;
  /** Akıştaki haber kaynakları ve bugünkü haber sayıları, çoktan aza. */
  newsSources: { name: string; count: number }[];
  toggleFollow: (name: string) => Promise<void>;
  /** Detayı açılmış içerikler; akışta en sona alınır. */
  readIds: ReadonlySet<string>;
  markRead: (id: string) => void;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

const INITIAL_FEED: TopicFeed = { state: 'loading', error: null, posts: [] };

/** Gün değişimi kontrolü ağ isteği yapmaz; yalnızca tarih değiştiyse akış yenilenir. */
const DAY_CHECK_INTERVAL_MS = 60_000;
/** Takip edilen kaynak varken akış bu aralıkla yenilenir ki yeni haber bildirilebilsin. */
const FOLLOW_POLL_INTERVAL_MS = 10 * 60_000;
/** Bir kaynaktan bundan fazla yeni haber gelirse tek tek değil özet bildirim gönderilir. */
const MAX_SINGLE_NOTIFICATIONS = 2;

const TOPIC_HASHTAG = Object.fromEntries(COMMUNITY_TOPICS.map((t) => [t.id, t.hashtag])) as Record<
  CommunityTopic,
  string
>;

function matchesKind(post: CommunityPost, kind: KindFilter): boolean {
  if (kind === 'all') return true;
  const isNews = post.kind === CommunityPostKind.News;
  return kind === 'news' ? isNews : !isNews;
}

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const [metal, setMetal] = useState<MetalFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [read, setRead] = useState<ReadFilter>('all');
  const [follow, setFollow] = useState<FollowFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [feeds, setFeeds] = useState<Record<CommunityTopic, TopicFeed>>({
    gold: INITIAL_FEED,
    silver: INITIAL_FEED,
  });
  const [follows, setFollows] = useState<SourceFollow[] | null>(null);
  const [readList, setReadList] = useState<string[]>([]);
  /** Bildirimi gönderilmiş haberler; yüklenene kadar bildirim kontrolü yapılmaz. */
  const notified = useRef<Set<string> | null>(null);

  useEffect(() => {
    let alive = true;
    readPostRepository
      .list()
      .then((ids) => {
        if (alive) setReadList((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))]);
      })
      .catch(() => undefined);
    Promise.all([sourceFollowRepository.listFollows(), sourceFollowRepository.listNotified()])
      .then(([savedFollows, savedNotified]) => {
        if (!alive) return;
        notified.current = new Set(savedNotified);
        setFollows(savedFollows);
      })
      .catch(() => {
        if (!alive) return;
        notified.current = new Set();
        setFollows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Ağdan çeker; durum yalnızca yanıttan sonra yazılır. */
  const fetchFeed = useCallback(async (topic: CommunityTopic) => {
    try {
      const posts = await communityRepository.getFeed(TOPIC_HASHTAG[topic]);
      setFeeds((prev) => ({ ...prev, [topic]: { state: 'ready', error: null, posts } }));
    } catch (e) {
      const message = userMessageForError(e, 'Haberler şu an alınamadı. Biraz sonra tekrar dene.');
      setFeeds((prev) => ({
        ...prev,
        // Önceden liste yüklendiyse o liste korunur.
        [topic]: prev[topic].posts.length ? prev[topic] : { state: 'error', error: message, posts: [] },
      }));
    }
  }, []);

  /** Akışın hangi güne ait olduğu; gün değişince liste yenilenir. */
  const loadedDay = useRef('');

  // Altın ve gümüş ayrı yüklenir; metal filtresi değişince yeniden istek gerekmez.
  const loadAll = useCallback(async () => {
    loadedDay.current = dayKey();
    await Promise.all(COMMUNITY_TOPICS.map((t) => fetchFeed(t.id)));
  }, [fetchFeed]);

  /** Yeni güne geçildiyse dünün listesi hemen kaldırılır, bugünün içeriği yüklenir. */
  const reloadIfNewDay = useCallback(() => {
    if (!loadedDay.current || dayKey() === loadedDay.current) return;
    setFeeds({ gold: INITIAL_FEED, silver: INITIAL_FEED });
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Uygulama açıkken gece yarısını, arka plandan dönüşte (zamanlayıcılar durmuş olabilir) gün değişimini yakalar.
  useEffect(() => {
    const timer = setInterval(reloadIfNewDay, DAY_CHECK_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reloadIfNewDay();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [reloadIfNewDay]);

  // Takip edilen kaynak varken, uygulama ön plandayken akış periyodik yenilenir.
  const hasFollows = !!follows?.length;
  useEffect(() => {
    if (!hasFollows) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && !networkMonitor.isOffline()) void loadAll();
    }, FOLLOW_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasFollows, loadAll]);

  // Kopukluk bitince akış kendiliğinden yenilenir.
  useNetworkRecovery(() => void loadAll());

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  const resetFilters = useCallback(() => {
    setMetal('all');
    setKind('all');
    setRead('all');
    setFollow('all');
  }, []);

  // Hem altın hem gümüşten bahseden içerik iki akışta da olabilir.
  const postsByMetal = useMemo(() => {
    const collect = (topics: CommunityTopic[]) => {
      const byId = new Map<string, CommunityPost>();
      for (const topic of topics) for (const post of feeds[topic].posts) byId.set(post.id, post);
      return [...byId.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    };
    return {
      all: collect(COMMUNITY_TOPICS.map((t) => t.id)),
      gold: collect(['gold']),
      silver: collect(['silver']),
    } satisfies Record<MetalFilter, CommunityPost[]>;
  }, [feeds]);

  const followedSources = useMemo(() => new Set((follows ?? []).map((f) => f.name)), [follows]);
  const readIds = useMemo(() => new Set(readList), [readList]);

  const markRead = useCallback((id: string) => {
    setReadList((prev) => (prev.includes(id) ? prev : [id, ...prev]));
    void readPostRepository.markRead(id).catch(() => undefined);
  }, []);

  const isFollowed = useCallback(
    (post: CommunityPost) => {
      const source = newsSourceOf(post);
      return !!source && followedSources.has(source);
    },
    [followedSources],
  );
  const matchesRead = useCallback(
    (post: CommunityPost, value: ReadFilter) => value === 'all' || readIds.has(post.id) === (value === 'read'),
    [readIds],
  );
  const matchesFollow = useCallback(
    (post: CommunityPost, value: FollowFilter) => value === 'all' || isFollowed(post) === (value === 'followed'),
    [isFollowed],
  );

  const feed = useMemo<CommunityFeed>(() => {
    const sources = metal === 'all' ? COMMUNITY_TOPICS.map((t) => feeds[t.id]) : [feeds[metal]];
    // Sıra: takip edilen kaynakların okunmamış haberleri, diğer okunmamışlar, en sonda okunanlar;
    // her grup kendi içinde yeniden eskiye.
    const filtered = postsByMetal[metal].filter(
      (post) => matchesKind(post, kind) && matchesRead(post, read) && matchesFollow(post, follow),
    );
    const unread = filtered.filter((p) => !readIds.has(p.id));
    const posts = [
      ...unread.filter(isFollowed),
      ...unread.filter((p) => !isFollowed(p)),
      ...filtered.filter((p) => readIds.has(p.id)),
    ];
    const state: LoadState = sources.some((s) => s.state === 'ready')
      ? 'ready'
      : sources.some((s) => s.state === 'loading')
        ? 'loading'
        : 'error';
    return { state, refreshing, error: sources.find((s) => s.error)?.error ?? null, posts };
  }, [feeds, postsByMetal, metal, kind, read, follow, refreshing, readIds, isFollowed, matchesRead, matchesFollow]);

  // Her seçeneğin sayısı, diğer gruplardaki mevcut seçimlerle birlikte getireceği içeriktir.
  const filterCounts = useMemo(() => {
    const count = (
      posts: CommunityPost[],
      k: KindFilter = kind,
      r: ReadFilter = read,
      f: FollowFilter = follow,
    ) => posts.filter((p) => matchesKind(p, k) && matchesRead(p, r) && matchesFollow(p, f)).length;
    const shown = postsByMetal[metal];
    return {
      metal: { all: count(postsByMetal.all), gold: count(postsByMetal.gold), silver: count(postsByMetal.silver) },
      kind: { all: count(shown, 'all'), news: count(shown, 'news'), post: count(shown, 'post') },
      read: { all: count(shown, kind, 'all'), unread: count(shown, kind, 'unread'), read: count(shown, kind, 'read') },
      follow: {
        all: count(shown, kind, read, 'all'),
        followed: count(shown, kind, read, 'followed'),
        unfollowed: count(shown, kind, read, 'unfollowed'),
      },
    };
  }, [postsByMetal, metal, kind, read, follow, matchesRead, matchesFollow]);

  const getPost = useCallback((id: string) => communityRepository.getPost(id), []);

  const newsSources = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of postsByMetal.all) {
      const source = newsSourceOf(post);
      if (source) counts.set(source, (counts.get(source) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'tr'));
  }, [postsByMetal]);

  const toggleFollow = useCallback(async (name: string) => {
    const following = (await sourceFollowRepository.listFollows()).some((f) => f.name === name);
    if (following) {
      setFollows(await sourceFollowRepository.unfollow(name));
      return;
    }
    // İzin reddedilse de takip kaydedilir; sıralama yine çalışır.
    await notificationsDatasource.ensurePermission();
    setFollows(await sourceFollowRepository.follow(name));
  }, []);

  // Takipten sonra yayımlanan, henüz bildirilmemiş haberler için bildirim.
  useEffect(() => {
    const seen = notified.current;
    if (!follows?.length || !seen) return;
    const groups = sourceFollowRepository.fresh(postsByMetal.all, follows, seen);
    if (!groups.size) return;
    const ids = [...groups.values()].flat().map((p) => p.id);
    for (const id of ids) seen.add(id);
    void (async () => {
      await sourceFollowRepository.markNotified(ids).catch(() => undefined);
      for (const [source, posts] of groups) {
        if (posts.length <= MAX_SINGLE_NOTIFICATIONS) {
          for (const post of posts) {
            await notificationsDatasource.present(source, post.title || post.body, `/post/${post.id}`);
          }
        } else {
          await notificationsDatasource.present(
            source,
            `${posts.length} yeni haber · ${posts[0].title || posts[0].body}`,
            '/community',
          );
        }
      }
    })();
  }, [postsByMetal, follows]);

  const value = useMemo(
    () => ({
      metal,
      kind,
      setMetal,
      setKind,
      read,
      follow,
      setRead,
      setFollow,
      resetFilters,
      feed,
      filterCounts,
      topicFeeds: feeds,
      refresh,
      getPost,
      followedSources,
      newsSources,
      toggleFollow,
      readIds,
      markRead,
    }),
    [
      metal,
      kind,
      read,
      follow,
      resetFilters,
      feed,
      filterCounts,
      feeds,
      refresh,
      getPost,
      followedSources,
      newsSources,
      toggleFollow,
      readIds,
      markRead,
    ],
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunityViewModel(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) {
    throw new Error('useCommunityViewModel must be used within CommunityProvider');
  }
  return ctx;
}
