import { makeStyles, useTheme } from '@/src/core/theme';
import { router } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Modal ekranların başlık çubuğunda sağ üstteki yuvarlak "X" kapatma düğmesi. */
export function HeaderCloseButton({ onPress }: { onPress?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Kapat"
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M6 6l12 12M18 6L6 18" stroke={colors.text.secondary} strokeWidth={2.8} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  pressed: { opacity: 0.6 },
}));
