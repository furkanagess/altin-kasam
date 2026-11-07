import { colors, paddings, radii } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function HashtagChip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.active]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <AppText
        variant="caption"
        style={{ color: active ? colors.text.onGold : colors.brand.goldDeep }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: paddings.sm,
    paddingVertical: paddings.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
  },
  active: {
    backgroundColor: colors.brand.gold,
    borderColor: colors.brand.gold,
  },
});
