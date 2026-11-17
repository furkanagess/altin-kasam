import { ANALYSIS_METAL_LABELS, OUTLOOK_LABELS, OUTLOOK_TONES } from '@/src/core/constants/analysis';
import { isWeeklyAnalysisLocked } from '@/src/core/constants/premium';
import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import { formatWeekRange } from '@/src/utils/format';
import { useWeeklyAnalyses } from '@/src/viewmodels/analysis/useWeeklyAnalyses';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useMarketTicker } from '@/src/viewmodels/market/useMarketTicker';
import { MarketTicker } from '@/src/widgets/organisms/MarketTicker';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { WeeklyAnalysisCard } from '@/src/widgets/organisms/WeeklyAnalysisCard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

/** Analizin konusu olan fiyatlar, bu sırayla ve okunaklı adlarla. */
const TICKER_ITEMS: { id: string; label: string }[] = [
  { id: 'gram', label: 'GRAM ALTIN' },
  { id: 'gumus', label: 'GRAM GÜMÜŞ' },
  { id: 'ons', label: 'ONS' },
];

const publishedFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Rapor bölümü: büyük harfli küçük başlık ve altında ince çizgi; kart çerçevesi yok. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>
        {title.toLocaleUpperCase('tr-TR')}
      </AppText>
      {children}
    </View>
  );
}

/** Haftalık analiz: rapor düzeninde beklenti, seviyeler ve bölümler. */
export default function WeeklyAnalysisScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { analyses, loading } = useWeeklyAnalyses();
  const { isPremium, openPaywall } = useSubscription();
  const allTicker = useMarketTicker();
  const ticker = useMemo(
    () =>
      TICKER_ITEMS.flatMap(({ id, label }) => {
        const item = allTicker.find((t) => t.id === id);
        return item ? [{ ...item, label }] : [];
      }),
    [allTicker],
  );
  const analysis = analyses.find((a) => a.id === id);

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand.gold} />
      </Screen>
    );
  }

  if (!analysis) {
    return (
      <Screen>
        <EmptyState title="Analiz bulunamadı" message="Bu hafta için yayımlanmış bir analiz yok." />
      </Screen>
    );
  }

  const others = analyses.filter((a) => a.id !== analysis.id);
  // Ücretsiz planda en güncel iki analiz kilitlidir (bildirim/bağlantıyla gelinse de); eski haftalar açıktır.
  const isLocked = (a: { id: string }) => isWeeklyAnalysisLocked(analyses.findIndex((x) => x.id === a.id), isPremium);

  if (isLocked(analysis)) {
    return (
      <Screen>
        <AppText variant="caption" tone="gold" style={styles.week}>
          {formatWeekRange(analysis.weekStart).toLocaleUpperCase('tr-TR')}
        </AppText>
        <EmptyState
          title="Bu analiz Pro’da"
          message="Güncel ve bir önceki haftanın analizi Pro’ya özeldir. Daha eski haftaların analizlerini ücretsiz okuyabilirsin."
          actionLabel="Pro’yu incele"
          onAction={() => openPaywall('weekly')}
        />
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <MarketTicker items={ticker} />
      <Screen scroll>
        <View style={styles.header}>
          <View style={styles.meta}>
            <AppText variant="caption" tone="gold" style={styles.week}>
              {formatWeekRange(analysis.weekStart).toLocaleUpperCase('tr-TR')}
            </AppText>
          </View>
          <AppText variant="h2">{analysis.summary}</AppText>
          <AppText variant="caption" tone="tertiary">
            {publishedFormatter.format(new Date(analysis.publishedAt))}
          </AppText>
        </View>

        <Section title="Haftalık beklenti">
          <View>
            {analysis.outlook.map((o, i) => (
              <View key={o.metal} style={[styles.outlookRow, i > 0 && styles.divider]}>
                <MetalIcon symbol={o.metal === 'gold' ? MetalSymbol.XAU : MetalSymbol.XAG} size={32} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{ANALYSIS_METAL_LABELS[o.metal]}</AppText>
                  {o.note ? (
                    <AppText variant="caption" tone="secondary">
                      {o.note}
                    </AppText>
                  ) : null}
                </View>
                <Badge label={OUTLOOK_LABELS[o.direction]} tone={OUTLOOK_TONES[o.direction]} />
              </View>
            ))}
          </View>
        </Section>

        {analysis.levels.length ? (
          <Section title="Takip edilen seviyeler">
            <View>
              <View style={styles.levelHead}>
                <View style={styles.flex} />
                <AppText variant="caption" tone="tertiary" style={styles.levelCol}>
                  DESTEK
                </AppText>
                <AppText variant="caption" tone="tertiary" style={styles.levelCol}>
                  DİRENÇ
                </AppText>
              </View>
              {analysis.levels.map((l) => (
                <View key={l.label} style={[styles.levelRow, styles.divider]}>
                  <AppText variant="body" tone="secondary" style={styles.flex} numberOfLines={1}>
                    {l.label}
                  </AppText>
                  {l.support || l.resistance ? (
                    <>
                      <AppText variant="bodyStrong" style={[styles.tabular, styles.levelCol]} numberOfLines={1}>
                        {l.support ?? '—'}
                      </AppText>
                      <AppText variant="bodyStrong" style={[styles.tabular, styles.levelCol]} numberOfLines={1}>
                        {l.resistance ?? '—'}
                      </AppText>
                    </>
                  ) : (
                    <AppText variant="bodyStrong" style={styles.tabular} numberOfLines={1}>
                      {l.value}
                    </AppText>
                  )}
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {analysis.sections.map((s) => (
          <Section key={s.title} title={s.title}>
            <AppText variant="body" style={styles.paragraph}>
              {s.comment}
            </AppText>
          </Section>
        ))}

        {others.length ? (
          <Section title="Önceki haftalar">
            <View>
              {others.map((a) => (
                <WeeklyAnalysisCard
                  key={a.id}
                  analysis={a}
                  dateOnly
                  locked={isLocked(a)}
                  onPress={() =>
                    isLocked(a)
                      ? openPaywall('weekly')
                      : router.replace({ pathname: '/analysis/[id]', params: { id: a.id } })
                  }
                />
              ))}
            </View>
          </Section>
        ) : null}

        <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
          Yatırım tavsiyesi değildir
        </AppText>
      </Screen>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  header: { gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: paddings.xs },
  week: { letterSpacing: 0.6, fontWeight: '700' },
  section: { gap: paddings.xs },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingBottom: paddings.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  outlookRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, paddingVertical: paddings.sm },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, paddingVertical: 10 },
  levelHead: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, paddingBottom: 4 },
  levelCol: { width: 88, textAlign: 'right' },
  paragraph: { lineHeight: 23 },
  disclaimer: { fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
}));
