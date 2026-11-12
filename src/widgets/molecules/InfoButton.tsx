import { useTheme } from '@/src/core/theme';
import React from 'react';
import { Pressable } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** Bölüm başlığının sağında "bu nedir?" düğmesi. */
export function InfoButton({ onPress, label }: { onPress: () => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ padding: 4 }}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9.5} stroke={colors.brand.goldDeep} strokeWidth={1.8} />
        <Path d="M12 11v5.5" stroke={colors.brand.goldDeep} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={12} cy={7.6} r={1.2} fill={colors.brand.goldDeep} />
      </Svg>
    </Pressable>
  );
}
