import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import type { CommunityPost, MetalInsight } from '@/src/domain/models';
import { formatRelativeTr } from '@/src/utils/format';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { useMarketInsights } from '@/src/viewmodels/insight/useMarketInsights';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { SentimentBadge, SentimentBar } from '@/src/widgets/molecules/SentimentBadge';
import { SignalGauge } from '@/src/widgets/molecules/SignalGauge';
import { TopTabs } from '@/src/widgets/molecules/TopTabs';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

type Topic = MetalInsight['topic'];

const TABS = [
  { id: 'gold', label: 'Altın' },
  { id: 'silver', label: 'Gümüş' },
] as const satisfies readonly { id: Topic; label: string }[];

function isTopic(value: unknown): value is Topic {
  return value === 'gold' || value === 'silver';
}

const reportDateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Rapor bölümü: büyük harfli küçük başlık, altında ince çizgi; kart çerçevesi yok. */
function Section({
  title,
  right,
  marker,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  /** Başlığın solundaki küçük renk işareti (yükseliş/düşüş). */
  marker?: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {marker ? <View style={[styles.marker, { backgroundColor: marker }]} /> : null}
        <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>
          {title}
        </AppText>
        {right}
      </View>
      {children}
    </View>
  );
}

function HeadlineList({ posts, emptyText }: { posts: CommunityPost[]; emptyText: string }) {
  const styles = useStyles();
  if (!posts.length) {
    return (
      <AppText variant="caption" tone="tertiary" style={styles.empty}>
        {emptyText}
      </AppText>
    );
  }
  return (
    <View>
      {posts.map((post, i) => (
        <Pressable
          key={post.id}
          onPress={() => router.push(`/post/${post.id}`)}
          style={[styles.headline, i > 0 && styles.headlineDivider]}
          accessibilityRole="button"
        >
          <AppText variant="caption" tone="tertiary" style={styles.headlineIndex}>
            {String(i + 1).padStart(2, '0')}
          </AppText>
          <View style={styles.headlineText}>
            <AppText variant="body" numberOfLines={2}>
              {post.title || post.body}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {post.author} · {formatRelativeTr(post.publishedAt)}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

export default function InsightScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ topic?: string }>();
  const [topic, setTopic] = useState<Topic>(isTopic(params.topic) ? params.topic : 'gold');
  const [reportDate] = useState(() => reportDateFormatter.format(Date.now()));
  const { isPremium, openPaywall } = useSubscription();
  const { refresh, feed } = useCommunityViewModel();
  const insights = useMarketInsights();

  if (!isPremium) {
    return (
      <Screen webWidth="readable" scroll>
        <AppText tone="secondary">
          Altın ve gümüşle ilgili bugünkü haber ve gönderilerin yönü ve özeti Pro’ya dahildir.
        </AppText>
        <AppButton label="Pro’yu incele" onPress={() => openPaywall('insight')} />
      </Screen>
    );
  }

  const insight = insights[topic];

  return (
    <View style={styles.root}>
      <TopTabs tabs={TABS} value={topic} onChange={setTopic} />
      {/* Sekme değişince kaydırma başa döner. */}
      <Screen webWidth="readable" key={topic} scroll onRefresh={() => void refresh()} refreshing={feed.refreshing}>
        {insights.loading && !insight.analyzed ? (
          <ActivityIndicator color={colors.brand.gold} />
        ) : (
          <>
            <View style={styles.report}>
              <AppText variant="caption" tone="tertiary">
                {`${reportDate} · ${insight.analyzed} haber ve gönderi incelendi`}
              </AppText>
            </View>

            <Section title="Genel görünüm" right={<SentimentBadge label={insight.label} />}>
              <SignalGauge signal={insight.signal} score={insight.score} size={160} />
              <SentimentBar counts={insight.counts} showLegend />
              <View style={styles.summary}>
                {insight.summary.split('\n\n').map((paragraph, i) => (
                  <AppText key={i} variant="body" style={styles.paragraph}>
                    {paragraph}
                  </AppText>
                ))}
              </View>
              {insight.topics.length ? (
                <View style={styles.topics}>
                  {insight.topics.map((t) => (
                    <HashtagChip key={t} label={t} />
                  ))}
                </View>
              ) : null}
            </Section>

            <Section
              title="Yükseliş yönlü başlıklar"
              marker={colors.semantic.up}
              right={<AppText variant="caption" tone="tertiary">{insight.topPositive.length}</AppText>}
            >
              <HeadlineList posts={insight.topPositive} emptyText="Bugün yükseliş yönlü başlık yok." />
            </Section>

            <Section
              title="Düşüş yönlü başlıklar"
              marker={colors.semantic.down}
              right={<AppText variant="caption" tone="tertiary">{insight.topNegative.length}</AppText>}
            >
              <HeadlineList posts={insight.topNegative} emptyText="Bugün düşüş yönlü başlık yok." />
            </Section>
          </>
        )}
        <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
          Yatırım tavsiyesi değildir
        </AppText>
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  report: {
    paddingBottom: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  section: { gap: 12, paddingTop: paddings.xs },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: paddings.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  sectionTitle: { flex: 1, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  marker: { width: 3, height: 14, borderRadius: 1 },
  summary: { gap: paddings.sm },
  paragraph: { lineHeight: 22 },
  topics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { fontStyle: 'italic' },
  disclaimer: { fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
  headline: { flexDirection: 'row', gap: paddings.sm, paddingVertical: paddings.sm },
  headlineDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  headlineIndex: { width: 20, paddingTop: 2, fontVariant: ['tabular-nums'], fontWeight: '600' },
  headlineText: { flex: 1, gap: 2 },
}));
