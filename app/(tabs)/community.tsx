import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { Screen } from '@/src/widgets/atoms/Screen';
import { BrandHeader } from '@/src/widgets/molecules/BrandHeader';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { PostCard } from '@/src/widgets/organisms/PostCard';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/src/core/theme';

export default function CommunityScreen() {
  const {
    state,
    error,
    posts,
    hashtags,
    selectedHashtag,
    setSelectedHashtag,
    refresh,
  } = useCommunityViewModel();

  return (
    <Screen scroll onRefresh={() => void refresh()} refreshing={state === 'loading'}>
      <BrandHeader />
      <SectionHeader
        title="Topluluk"
        subtitle="Hashtag’lerle altın ve emtia sohbeti"
      />

      <View style={styles.chips}>
        <HashtagChip
          label="Tümü"
          active={!selectedHashtag}
          onPress={() => setSelectedHashtag(null)}
        />
        {hashtags.map((tag) => (
          <HashtagChip
            key={tag}
            label={tag}
            active={selectedHashtag === tag}
            onPress={() => setSelectedHashtag(tag)}
          />
        ))}
      </View>

      {state === 'loading' && !posts.length ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : null}

      {state === 'error' ? (
        <EmptyState
          title="Akış alınamadı"
          message={error ?? 'Bilinmeyen hata'}
          actionLabel="Yenile"
          onAction={() => void refresh()}
        />
      ) : null}

      {state === 'ready' && posts.length === 0 ? (
        <EmptyState
          title="Gönderi yok"
          message="Bu hashtag için henüz içerik bulunamadı."
          actionLabel="Filtreyi temizle"
          onAction={() => setSelectedHashtag(null)}
        />
      ) : null}

      <View style={styles.list}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onPress={() => router.push(`/post/${post.id}`)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  list: { gap: 10 },
});
