import { makeStyles, radii, useTheme } from '@/src/core/theme';
import { router } from 'expo-router';
import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Üst çubuktaki üçgen ünlem düğmesi: öneri / sorun gönderme ekranını açar. */
export function HeaderSupportButton() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push('/support')}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Öneri veya sorun gönder"
      hitSlop={8}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
          stroke={colors.brand.ink}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M12 9v4M12 17h.01" stroke={colors.brand.ink} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  button: { padding: 6, borderRadius: radii.pill },
}));
