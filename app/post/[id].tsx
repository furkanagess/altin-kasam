import { COMMUNITY_KIND_LABELS } from '@/src/core/constants/community';
import type { ArticleSummary } from '@/src/data/datasources/articleTypes';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { CommunityPostKind } from '@/src/domain/enums';
import type { CommunityPost } from '@/src/domain/models';
import { formatRelativeTr } from '@/src/utils/format';
import { useArticleSummary } from '@/src/viewmodels/community/useArticleSummary';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { Screen } from '@/src/widgets/atoms/Screen';
import { FollowButton } from '@/src/widgets/molecules/FollowButton';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

/** Haberin sayfasından çıkarılan açıklama ve ilk paragraflar; alınamazsa akıştaki metin. */
function SummaryCard({
  post,
  summary,
  loading,
}: {
  post: CommunityPost;
  summary: ArticleSummary | null;
  loading: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const isNews = post.kind === CommunityPostKind.News;

  // Yayıncının önizleme açıklaması, yoksa RSS özeti; haber metninin tamamı kaynağında okunur.
  const preview = summary?.description ?? post.body;
  const text = preview ? [preview] : [];

  if (!isNews) {
    return post.body ? <AppText variant="body">{post.body}</AppText> : null;
  }

  return (
    <View style={styles.summary}>
      <AppText variant="caption" tone="gold" style={styles.summaryTitle}>
        ÖZET
      </AppText>
      {loading && !text.length ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.brand.gold} />
          <AppText variant="caption" tone="secondary">
            Haber özeti hazırlanıyor…
          </AppText>
        </View>
      ) : text.length ? (
        text.map((p, i) => (
          <AppText key={i} variant="body" style={i === 0 ? styles.lead : undefined}>
            {p}
          </AppText>
        ))
      ) : (
        <AppText variant="body" tone="secondary">
          Bu haberin özeti alınamadı; tamamını kaynağında okuyabilirsin.
        </AppText>
      )}
    </View>
  );
}

export default function PostDetailScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPost, markRead } = useCommunityViewModel();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const article = useArticleSummary(post?.kind === CommunityPostKind.News ? post.url : undefined);

  // Detayı açılan içerik akışta "Okundu" olarak işaretlenir ve sona alınır.
  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead]);

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
        <Stack.Screen options={{ title: 'İçerik' }} />
        <AppText>İçerik bulunamadı</AppText>
      </Screen>
    );
  }

  // Yönlendirmeden sonraki asıl haber adresi varsa ona gidilir.
  const url = article.summary?.url ?? post.url;

  return (
    <Screen
      scroll
      footer={
        url ? (
          <AppButton
            label={post.kind === CommunityPostKind.News ? 'Haberin tamamını oku' : `${post.source} üzerinde aç`}
            onPress={() => router.push({ pathname: '/reader', params: { url, title: post.source } })}
          />
        ) : null
      }
    >
      <Stack.Screen options={{ title: COMMUNITY_KIND_LABELS[post.kind] }} />
      <View style={styles.metaRow}>
        <Badge label={COMMUNITY_KIND_LABELS[post.kind]} tone="gold" />
        <AppText variant="caption" tone="tertiary">
          {formatRelativeTr(post.publishedAt)}
        </AppText>
      </View>
      {post.title ? <AppText variant="h1">{post.title}</AppText> : null}
      <View style={styles.sourceRow}>
        <AppText variant="caption" tone="secondary" style={styles.sourceText}>
          {post.author === post.source ? post.author : `${post.author} · ${post.source}`}
          {post.likes != null ? ` · ${post.likes} beğeni` : ''}
        </AppText>
        {post.kind === CommunityPostKind.News ? <FollowButton source={post.author} /> : null}
      </View>

      <SummaryCard post={post} summary={article.summary} loading={article.loading} />

      {post.hashtags.length ? (
        <View style={styles.tags}>
          {post.hashtags.map((tag) => (
            <HashtagChip key={tag} label={tag} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  sourceText: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: {
    gap: paddings.sm,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  summaryTitle: { letterSpacing: 0.6, fontWeight: '700' },
  lead: { fontWeight: '600' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
}));
