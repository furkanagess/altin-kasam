import { pageMetadata } from '@/src/core/web/seo';
import type { GenerateMetadataFunction } from 'expo-router/server';
import { useBreakpoint } from '@/src/core/theme/web';
import { WideColumns } from '@/src/widgets/molecules/WideColumns';
import { useTheme } from '@/src/core/theme';
import { CommunityPostKind } from '@/src/domain/enums';
import {
  useCommunityViewModel,
  type FollowFilter,
  type KindFilter,
  type MetalFilter,
  type ReadFilter,
} from '@/src/viewmodels/community/CommunityProvider';
import { useMarketInsights } from '@/src/viewmodels/insight/useMarketInsights';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { TourTarget } from '@/src/widgets/atoms/TourTarget';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { FilterButton } from '@/src/widgets/molecules/FilterButton';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { FilterSheet } from '@/src/widgets/organisms/FilterSheet';
import { InsightCard } from '@/src/widgets/organisms/InsightCard';
import { PostCard } from '@/src/widgets/organisms/PostCard';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const METAL_OPTIONS: { id: MetalFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'gold', label: 'Altın' },
  { id: 'silver', label: 'Gümüş' },
];

const KIND_OPTIONS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'news', label: 'Haber' },
  { id: 'post', label: 'Gönderi' },
];

const READ_OPTIONS: { id: ReadFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'unread', label: 'Okunmamış' },
  { id: 'read', label: 'Okunanlar' },
];

const FOLLOW_OPTIONS: { id: FollowFilter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'followed', label: 'Takip ettiklerim' },
  { id: 'unfollowed', label: 'Takip etmediklerim' },
];

/** Sunucu çıktısındaki sayfa başlığı ve açıklaması (arama ve paylaşım önizlemesi). */
export const generateMetadata: GenerateMetadataFunction = () => pageMetadata({ title: 'Altın haberleri ve topluluk', description: 'Altın ve gümüşle ilgili günün haberleri, topluluk paylaşımları ve piyasa beklentisi.', path: '/community' });

export default function CommunityScreen() {
  const { colors } = useTheme();
  const {
    metal,
    kind,
    read,
    follow,
    setMetal,
    setKind,
    setRead,
    setFollow,
    resetFilters,
    feed,
    filterCounts,
    refresh,
    followedSources,
    readIds,
  } = useCommunityViewModel();
  // Akış sırası: takip edilenler, diğer okunmamışlar, okunanlar (bkz. CommunityProvider).
  const groupOf = (post: (typeof feed.posts)[number]): 'followed' | 'other' | 'read' =>
    readIds.has(post.id)
      ? 'read'
      : followedSources.has(post.author) && post.kind === CommunityPostKind.News
        ? 'followed'
        : 'other';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const insights = useMarketInsights();
  const { isPremium, openPaywall } = useSubscription();
  const activeFilters = [
    metal !== 'all'
      ? {
          key: 'metal',
          label: METAL_OPTIONS.find((o) => o.id === metal)?.label,
          clear: () => setMetal('all'),
        }
      : null,
    kind !== 'all'
      ? {
          key: 'kind',
          label: KIND_OPTIONS.find((o) => o.id === kind)?.label,
          clear: () => setKind('all'),
        }
      : null,
    read !== 'all'
      ? {
          key: 'read',
          label: READ_OPTIONS.find((o) => o.id === read)?.label,
          clear: () => setRead('all'),
        }
      : null,
    follow !== 'all'
      ? {
          key: 'follow',
          label: FOLLOW_OPTIONS.find((o) => o.id === follow)?.label,
          clear: () => setFollow('all'),
        }
      : null,
  ].filter((f) => f !== null);
  const expanded = useBreakpoint() === 'expanded';

  const insightBlock = (
    <>
      <TourTarget id="community-insight">
      <InsightCard
        gold={insights.gold}
        silver={insights.silver}
        loading={insights.loading}
        locked={!isPremium}
        onLockedPress={() => openPaywall('insight')}
        onOpen={(topic) => router.push({ pathname: '/insight', params: { topic } })}
      />
      </TourTarget>
    </>
  );
  const feedBlock = (
    <>
      <View style={styles.toolbar}>
        <View style={styles.toolbarLeft}>
          {feed.posts.length ? (
            <AppText variant="caption" tone="tertiary">Bugün {feed.posts.length} içerik</AppText>
          ) : null}
          {activeFilters.length ? (
            <View style={styles.chips}>
              {activeFilters.map((f) => (
                <HashtagChip key={f.key} label={`${f.label} ✕`} active onPress={f.clear} />
              ))}
            </View>
          ) : null}
        </View>
        <FilterButton activeCount={activeFilters.length} onPress={() => setFiltersOpen(true)} />
      </View>

      {feed.state === 'loading' && !feed.posts.length ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : null}

      {feed.state === 'error' && !feed.posts.length ? (
        <EmptyState
          title="Akış alınamadı"
          message={feed.error ?? 'Bilinmeyen hata'}
          actionLabel="Yenile"
          onAction={() => void refresh()}
        />
      ) : null}

      {feed.state === 'ready' && feed.posts.length === 0 ? (
        activeFilters.length ? (
          <EmptyState
            title="Bu filtreye uygun içerik yok"
            message="Bugün seçtiğin filtreyle eşleşen haber veya gönderi henüz yok."
            actionLabel="Filtreleri temizle"
            onAction={resetFilters}
          />
        ) : (
          <EmptyState
            title="Bugün henüz içerik yok"
            message="Altın veya gümüşle ilgili bugün paylaşılan haber ya da gönderi henüz yok. Gün içinde aşağı çekip yenileyebilirsin."
            actionLabel="Yenile"
            onAction={() => void refresh()}
          />
        )
      ) : null}

      <View style={styles.list}>
        {feed.posts.map((post, i) => {
          const group = groupOf(post);
          const prevGroup = i > 0 ? groupOf(feed.posts[i - 1]) : null;
          return (
            <React.Fragment key={post.id}>
              {group === 'followed' && i === 0 ? (
                <View style={styles.sectionRow}>
                  <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
                    TAKİP ETTİKLERİN
                  </AppText>
                  <AppText variant="caption" tone="gold" onPress={() => router.push('/sources')}>
                    Yönet ›
                  </AppText>
                </View>
              ) : null}
              {group === 'other' && prevGroup === 'followed' ? (
                <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
                  DİĞER İÇERİKLER
                </AppText>
              ) : null}
              {group === 'read' && prevGroup !== 'read' && read !== 'read' ? (
                <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
                  {`OKUNANLAR · ${feed.posts.length - i}`}
                </AppText>
              ) : null}
              <PostCard
                post={post}
                followed={followedSources.has(post.author) && post.kind === CommunityPostKind.News}
                read={group === 'read'}
                onPress={() => router.push(`/post/${post.id}`)}
              />
            </React.Fragment>
          );
        })}
      </View>
    </>
  );

  return (
    <Screen scroll scrollId="community" onRefresh={() => void refresh()} refreshing={feed.refreshing}>
      {/* Masaüstünde akış solda, topluluk beklentisi sağda sabit; telefonda beklenti üstte. */}
      {expanded ? (
        <WideColumns main={feedBlock} aside={insightBlock} asideWidth={380} stickyAside />
      ) : (
        <>
          {insightBlock}
          {feedBlock}
        </>
      )}

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={resetFilters}
        activeCount={activeFilters.length}
        resultCount={feed.posts.length}
        groups={[
          {
            title: 'Metal',
            options: METAL_OPTIONS.map((o) => ({ ...o, count: filterCounts.metal[o.id] })),
            value: metal,
            onChange: (id) => setMetal(id as MetalFilter),
          },
          {
            title: 'İçerik türü',
            options: KIND_OPTIONS.map((o) => ({ ...o, count: filterCounts.kind[o.id] })),
            value: kind,
            onChange: (id) => setKind(id as KindFilter),
          },
          {
            title: 'Okunma durumu',
            hint: 'Açtığın içerikler okundu sayılır.',
            options: READ_OPTIONS.map((o) => ({ ...o, count: filterCounts.read[o.id] })),
            value: read,
            onChange: (id) => setRead(id as ReadFilter),
          },
          {
            title: 'Kaynak',
            hint: 'Takip yalnızca haber kaynakları için.',
            options: FOLLOW_OPTIONS.map((o) => ({ ...o, count: filterCounts.follow[o.id] })),
            value: follow,
            onChange: (id) => setFollow(id as FollowFilter),
          },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarLeft: { flex: 1, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { letterSpacing: 0.6 },
});
