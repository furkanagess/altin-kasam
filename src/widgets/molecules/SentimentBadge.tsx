import { makeStyles, useTheme } from '@/src/core/theme';
import type { MetalInsight, SentimentLabel } from '@/src/domain/models';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import React from 'react';
import { View } from 'react-native';

const BADGE: Record<SentimentLabel, { label: string; tone: 'up' | 'down' | 'neutral' | 'warning' }> = {
  positive: { label: 'Olumlu ↑', tone: 'up' },
  negative: { label: 'Olumsuz ↓', tone: 'down' },
  neutral: { label: 'Nötr', tone: 'neutral' },
  insufficient: { label: 'Veri az', tone: 'warning' },
};

export function SentimentBadge({ label }: { label: SentimentLabel }) {
  return <Badge label={BADGE[label].label} tone={BADGE[label].tone} />;
}

/** Yükseliş / nötr / düşüş dağılımı. */
export function SentimentBar({
  counts,
  showLegend,
}: {
  counts: MetalInsight['counts'];
  showLegend?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const total = counts.positive + counts.neutral + counts.negative;
  const segments = [
    { key: 'positive', value: counts.positive, color: colors.semantic.up },
    { key: 'neutral', value: counts.neutral, color: colors.border.strong },
    { key: 'negative', value: counts.negative, color: colors.semantic.down },
  ];
  return (
    <View style={styles.wrap}>
      <View
        style={styles.track}
        accessibilityLabel={`${counts.positive} yükseliş, ${counts.neutral} nötr, ${counts.negative} düşüş yönlü içerik`}
      >
        {total
          ? segments
              .filter((s) => s.value)
              .map((s) => (
                <View key={s.key} style={{ flex: s.value, backgroundColor: s.color }} />
              ))
          : null}
      </View>
      {showLegend ? (
        <AppText variant="caption" tone="secondary">
          {counts.positive} yükseliş · {counts.neutral} nötr · {counts.negative} düşüş
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 4 },
  track: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: colors.surface.muted,
  },
}));
