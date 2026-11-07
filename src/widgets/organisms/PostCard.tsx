import { colors, paddings, radii } from '@/src/core/theme';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';
import { formatRelativeTr } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const kindLabel: Record<CommunityPostKind, string> = {
  [CommunityPostKind.Tweet]: 'Tweet',
  [CommunityPostKind.Blog]: 'Blog',
  [CommunityPostKind.Article]: 'Yazı',
};

type Props = {
  post: CommunityPost;
  onPress?: () => void;
};

export function PostCard({ post, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
      <View style={styles.meta}>
        <Badge label={kindLabel[post.kind]} tone="gold" />
        <AppText variant="caption" tone="tertiary">
          {formatRelativeTr(post.publishedAt)}
        </AppText>
      </View>
      {post.title ? <AppText variant="h3">{post.title}</AppText> : null}
      <AppText variant="body" tone="secondary" numberOfLines={3}>
        {post.body}
      </AppText>
      <View style={styles.footer}>
        <AppText variant="caption" tone="secondary">
          {post.author}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {post.hashtags.slice(0, 3).join(' ')}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: paddings.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footer: {
    gap: 4,
    marginTop: 4,
  },
});
