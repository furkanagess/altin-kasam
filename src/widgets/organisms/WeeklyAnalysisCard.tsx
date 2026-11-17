import { ANALYSIS_METAL_LABELS, OUTLOOK_LABELS, OUTLOOK_TONES } from '@/src/core/constants/analysis';
import { makeStyles, paddings, radii } from '@/src/core/theme';
import type { WeeklyAnalysis } from '@/src/domain/models';
import { formatWeekRange } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  analysis: WeeklyAnalysis;
  onPress: () => void;
  /** Liste satırında (önceki haftalar) kısa görünüm. */
  compact?: boolean;
  /** Yalnızca hafta tarihi (ör. Analiz sekmesindeki önceki haftalar). */
  dateOnly?: boolean;
  /** Pro'ya özel (en güncel hafta): PRO işareti, özet gizli; dokunma davranışı üst bileşende. */
  locked?: boolean;
};

/** Haftalık analizin özeti: hafta, başlık, metal başına beklenti ve "Devamını oku". */
export function WeeklyAnalysisCard({ analysis, onPress, compact, dateOnly, locked }: Props) {
  const styles = useStyles();
  if (dateOnly) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.dateOnly, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`${formatWeekRange(analysis.weekStart)} haftalık analiz${locked ? ', Pro' : ''}`}
      >
        <AppText variant="caption" tone="gold" style={[styles.week, styles.flex]}>
          {formatWeekRange(analysis.weekStart).toLocaleUpperCase('tr-TR')}
        </AppText>
        {locked ? <ProMark /> : null}
        <AppText variant="bodyStrong" tone="gold">
          ›
        </AppText>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, !compact && styles.featured, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${formatWeekRange(analysis.weekStart)} haftalık analiz: ${analysis.summary}${locked ? ', Pro' : ''}`}
    >
      <View style={styles.meta}>
        <AppText variant="caption" tone="gold" style={styles.week}>
          {formatWeekRange(analysis.weekStart).toLocaleUpperCase('tr-TR')}
        </AppText>
        {locked ? <ProMark /> : null}
      </View>
      <AppText variant={compact ? 'bodyStrong' : 'h3'} numberOfLines={compact ? 2 : 4}>
        {analysis.summary}
      </AppText>
      {locked ? null : <View style={styles.outlook}>
        {analysis.outlook.map((o) => (
          <Badge
            key={o.metal}
            label={`${ANALYSIS_METAL_LABELS[o.metal]}: ${OUTLOOK_LABELS[o.direction]}`}
            tone={OUTLOOK_TONES[o.direction]}
          />
        ))}
      </View>}
      {!compact ? (
        <AppText variant="caption" tone="gold" style={styles.more}>
          {locked ? 'Pro ile oku ›' : 'Devamını oku ›'}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: paddings.xs,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  featured: { borderColor: colors.brand.goldSoft },
  pressed: { opacity: 0.85 },
  dateOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.xs,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  flex: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: paddings.xs },
  week: { letterSpacing: 0.6, fontWeight: '700' },
  outlook: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 2 },
  more: { fontWeight: '600', paddingTop: 2 },
}));
