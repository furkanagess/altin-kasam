import { colors, paddings, radii } from '@/src/core/theme';
import type { ValuedHolding } from '@/src/domain/models';
import { formatPercent, formatTRY } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  holding: ValuedHolding;
  onPress?: () => void;
};

export function HoldingRow({ holding, onPress }: Props) {
  const up = holding.pnl >= 0;
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <View style={styles.left}>
        <AppText variant="bodyStrong">{holding.label}</AppText>
        <AppText variant="caption" tone="tertiary">
          {holding.quantity} adet · birim {formatTRY(holding.unitPrice)}
        </AppText>
      </View>
      <View style={styles.right}>
        <AppText variant="bodyStrong">{formatTRY(holding.marketValue)}</AppText>
        <Badge label={formatPercent(holding.pnlPercent)} tone={up ? 'up' : 'down'} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: paddings.card,
    borderRadius: radii.md,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  left: { flex: 1, gap: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
});
