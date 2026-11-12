import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { Pressable } from 'react-native';

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function HashtagChip({ label, active, onPress }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
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

const useStyles = makeStyles((colors) => ({
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
}));
