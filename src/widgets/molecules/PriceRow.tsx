import { colors, paddings, radii } from '@/src/core/theme';
import type { MetalQuote } from '@/src/domain/models';
import { formatPercent, formatTRY } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  quote: MetalQuote;
  selected?: boolean;
  onPress?: () => void;
};

export function PriceRow({ quote, selected, onPress }: Props) {
  const up = quote.changePercent >= 0;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.selected]}
      accessibilityRole="button"
    >
      <View style={styles.left}>
        <AppText variant="bodyStrong">{quote.name}</AppText>
        <AppText variant="caption" tone="tertiary">
          {quote.symbol} · {quote.unit}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="bodyStrong">{formatTRY(quote.bid)}</AppText>
        <Badge
          label={formatPercent(quote.changePercent)}
          tone={up ? 'up' : 'down'}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: paddings.card,
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 12,
  },
  selected: {
    borderColor: colors.brand.gold,
    backgroundColor: '#FFF8EC',
  },
  left: { flex: 1, gap: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
});
