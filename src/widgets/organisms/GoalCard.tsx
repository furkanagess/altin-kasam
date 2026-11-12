import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { GoalProgressView } from '@/src/domain/models';
import { formatGrams, formatMoney, formatMonthYear } from '@/src/utils/format';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Hedef tamamlanınca başlığın yanında görünen onay işareti. */
function DoneMark() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.doneMark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.semantic.up} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** "Hedefin 2 g fazlası" gibi aşım metni; tam hedefte boş. */
function overshoot(progress: GoalProgressView): string | null {
  const extra = progress.gramsAdded - progress.goal.grams;
  return extra > 0.005 ? `Hedefin ${formatGrams(extra)} üzerindesin.` : null;
}

type Props = {
  progress: GoalProgressView | null;
  onEdit: () => void;
  /** Tek satır başlık + ilerleme çubuğu; ekranın üstünde yer kaplamaması için. */
  compact?: boolean;
};

function CompactGoal({ progress, onEdit }: Omit<Props, 'compact'>) {
  const styles = useStyles();
  if (!progress) {
    return (
      <Pressable onPress={onEdit} style={[styles.card, styles.compact, styles.compactRow]} accessibilityRole="button">
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Altın biriktirme hedefi belirle</AppText>
          <AppText variant="caption" tone="secondary">
            Aylık ya da yıllık gram hedefi; ilerlemen burada görünür
          </AppText>
        </View>
        <AppText variant="bodyStrong" tone="gold">
          ›
        </AppText>
      </Pressable>
    );
  }
  const { goal, ratio, daysLeft } = progress;
  const title =
    goal.period === 'monthly'
      ? `${formatMonthYear(progress.periodStart)} hedefi`
      : `${new Date(progress.periodStart).getFullYear()} hedefi`;
  const done = ratio >= 1;
  const percent = Math.round(ratio * 100);
  if (done) {
    return (
      <View style={[styles.card, styles.compact, styles.cardDone]}>
        <View style={styles.compactRow}>
          <DoneMark />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{title} tamamlandı</AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={2}>
              {`${formatGrams(progress.gramsAdded)} / ${formatGrams(goal.grams)} altın`}
              {overshoot(progress) ? ` · ${overshoot(progress)}` : ''}
            </AppText>
          </View>
          <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Hedefi düzenle">
            <AppText variant="caption" tone="gold">Düzenle</AppText>
          </Pressable>
        </View>
        <View style={[styles.track, styles.trackThin]} accessibilityRole="progressbar" accessibilityLabel={title} accessibilityValue={{ min: 0, max: 100, now: 100 }}>
          <View style={[styles.fill, styles.trackThin, styles.fillDone, { width: '100%' }]} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.card, styles.compact]}>
      <View style={styles.header}>
        <AppText variant="caption" tone="secondary" style={styles.flex} numberOfLines={1}>
          {`${title} · ${daysLeft} gün kaldı`}
        </AppText>
        <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Hedefi düzenle">
          <AppText variant="caption" tone="gold">
            Düzenle
          </AppText>
        </Pressable>
      </View>
      <View style={styles.compactRow}>
        <AppText variant="bodyStrong" style={styles.flex}>
          {formatGrams(progress.gramsAdded)}
          <AppText variant="caption" tone="secondary">{` / ${formatGrams(goal.grams)} altın`}</AppText>
        </AppText>
        <AppText variant="bodyStrong" tone="gold">
          %{percent}
        </AppText>
      </View>
      <View
        style={[styles.track, styles.trackThin]}
        accessibilityRole="progressbar"
        accessibilityLabel={title}
        accessibilityValue={{ min: 0, max: 100, now: Math.min(percent, 100) }}
      >
        <View style={[styles.fill, styles.trackThin, { width: `${Math.min(ratio, 1) * 100}%` }]} />
      </View>
    </View>
  );
}

export function GoalCard({ progress, onEdit, compact }: Props) {
  const styles = useStyles();
  if (compact) return <CompactGoal progress={progress} onEdit={onEdit} />;
  if (!progress) {
    return (
      <View style={styles.card}>
        <AppText variant="bodyStrong">Altın biriktirme hedefi belirle</AppText>
        <AppText variant="caption" tone="secondary">
          Ayda ya da yılda kaç gram altın biriktirmek istediğini belirle; ilerlemeni burada takip
          et.
        </AppText>
        <AppButton label="Hedef belirle" variant="secondary" onPress={onEdit} />
      </View>
    );
  }

  const { goal, display, currency, ratio, daysLeft, purchases } = progress;
  const monthly = goal.period === 'monthly';
  const title = monthly
    ? `${formatMonthYear(progress.periodStart)} hedefi`
    : `${new Date(progress.periodStart).getFullYear()} yılı hedefi`;
  const done = ratio >= 1;
  const percent = Math.round(ratio * 100);

  if (done) {
    return (
      <View style={[styles.card, styles.cardDone]}>
        <View style={styles.header}>
          <View style={styles.doneTitle}>
            <DoneMark />
            <AppText variant="bodyStrong">Hedefe ulaştın</AppText>
          </View>
          <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button">
            <AppText variant="caption" tone="gold">Düzenle</AppText>
          </Pressable>
        </View>
        <AppText variant="caption" tone="secondary">{title}</AppText>
        <View style={styles.amounts}>
          <AppText variant="price">{formatGrams(progress.gramsAdded)}</AppText>
          <AppText variant="body" tone="secondary"> / {formatGrams(goal.grams)} altın</AppText>
        </View>
        <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={title} accessibilityValue={{ min: 0, max: 100, now: 100 }}>
          <View style={[styles.fill, styles.fillDone, { width: '100%' }]} />
        </View>
        <AppText variant="caption" tone="secondary">
          {overshoot(progress) ?? 'Hedefini tam olarak tamamladın.'} Yeni dönem {daysLeft} gün sonra başlıyor; istersen
          hedefi büyütebilirsin.
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Bu {monthly ? 'ay' : 'yıl'} {purchases} alım · {formatMoney(display.spent, currency)} harcandı. 24 ayar gram
          karşılığı sayılır.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="caption" tone="secondary">{title}</AppText>
        <Pressable onPress={onEdit} hitSlop={8} accessibilityRole="button">
          <AppText variant="caption" tone="gold">Düzenle</AppText>
        </Pressable>
      </View>

      <View style={styles.amounts}>
        <AppText variant="price">{formatGrams(progress.gramsAdded)}</AppText>
        <AppText variant="body" tone="secondary"> / {formatGrams(goal.grams)} altın</AppText>
      </View>

      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel={title}
        accessibilityValue={{ min: 0, max: 100, now: Math.min(percent, 100) }}
      >
        <View
          style={[
            styles.fill,
            { width: `${Math.min(ratio, 1) * 100}%` },
          ]}
        />
      </View>

      <AppText variant="caption" tone="secondary">
        %{percent} tamamlandı · {formatGrams(progress.remainingGrams)} kaldı
        {display.remainingCost != null ? ` (≈ ${formatMoney(display.remainingCost, currency)})` : ''}
        {' · '}
        {daysLeft} gün kaldı
      </AppText>

      <AppText variant="caption" tone="tertiary">
        Bu {monthly ? 'ay' : 'yıl'} {purchases} alım · {formatMoney(display.spent, currency)}{' '}
        harcandı. 24 ayar gram karşılığı sayılır.
      </AppText>

    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: 10,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  // Tamamlanınca kutu açılır: uygulamanın düz listeleri gibi yalnızca üstte ve altta ince çizgi.
  cardDone: {
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    borderBottomColor: colors.border.subtle,
  },
  // Dolu daire yerine ince çizgili onay halkası; diğer çizgi ikonlarla aynı dil.
  doneMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.semantic.up,
  },
  doneTitle: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amounts: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface.muted,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand.gold,
  },
  fillDone: {
    backgroundColor: colors.semantic.up,
  },
  flex: { flex: 1 },
  compact: { gap: 6, paddingVertical: paddings.sm },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  trackThin: { height: 6, borderRadius: 3 },
}));
