import { CommunityPostKind } from '@/src/domain/enums';
import { formatRelativeTr } from '@/src/utils/format';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { Screen } from '@/src/widgets/atoms/Screen';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { CommunityPost } from '@/src/domain/models';
import { colors } from '@/src/core/theme';

const kindLabel: Record<CommunityPostKind, string> = {
  [CommunityPostKind.Tweet]: 'Tweet',
  [CommunityPostKind.Blog]: 'Blog',
  [CommunityPostKind.Article]: 'Yazı',
};

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPost, setSelectedHashtag } = useCommunityViewModel();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const next = id ? await getPost(id) : null;
      if (alive) {
        setPost(next);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, getPost]);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand.gold} />
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen>
        <AppText>Gönderi bulunamadı</AppText>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Badge label={kindLabel[post.kind]} tone="gold" />
        <AppText variant="caption" tone="tertiary">
          {formatRelativeTr(post.publishedAt)}
        </AppText>
      </View>
      {post.title ? <AppText variant="h1">{post.title}</AppText> : null}
      <AppText variant="body">{post.body}</AppText>
      <AppText variant="caption" tone="secondary">
        {post.author} · {post.source} · {post.likes} beğeni
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {post.hashtags.map((tag) => (
          <HashtagChip
            key={tag}
            label={tag}
            onPress={() => setSelectedHashtag(tag)}
          />
        ))}
      </View>
    </Screen>
  );
}
