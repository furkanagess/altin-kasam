import { makeStyles, radii, useTheme } from '@/src/core/theme';
import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Grafik başlığındaki "detaya / tam ekrana git" düğmesi; zil düğmesiyle aynı ölçüde. */
export function FullscreenButton({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
          stroke={colors.brand.goldDeep}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  pressed: { opacity: 0.7 },
}));
