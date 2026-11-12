import { makeStyles, radii } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { Pressable, View } from 'react-native';

export type CardQuantity = {
  /** Gösterilen miktar (ör. "2", "1.000"). */
  label: string;
  /** Ekran okuyucu için birim (ör. "adet", "gram", "USD"). */
  unit: string;
  canDecrement: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
};

/** Seçili varlık kartının sağ üstünde: miktarı karttan azalt / artır. */
export function CardQuantityControl({ label, unit, canDecrement, onIncrement, onDecrement }: CardQuantity) {
  const styles = useStyles();
  return (
    <View style={styles.pill}>
      <Pressable
        onPress={onDecrement}
        disabled={!canDecrement}
        style={[styles.button, !canDecrement && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`Bir ${unit} azalt`}
        hitSlop={6}
      >
        <AppText variant="bodyStrong" style={styles.sign}>
          −
        </AppText>
      </Pressable>
      <AppText variant="caption" style={styles.count} numberOfLines={1}>
        {label}
      </AppText>
      <Pressable
        onPress={onIncrement}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={`Bir ${unit} artır`}
        hitSlop={6}
      >
        <AppText variant="bodyStrong" style={styles.sign}>
          +
        </AppText>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  pill: {
    position: 'absolute',
    top: 5,
    right: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.gold,
  },
  button: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  disabled: { opacity: 0.45 },
  sign: { fontSize: 14, lineHeight: 18, color: colors.brand.goldDeep },
  count: { minWidth: 14, textAlign: 'center', fontWeight: '700', color: colors.text.onGold },
}));
