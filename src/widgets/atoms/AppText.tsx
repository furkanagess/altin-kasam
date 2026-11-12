import { typography, useTheme, type AppColors } from '@/src/core/theme';
import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

type Variant = keyof typeof typography;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'gold' | 'up' | 'down';

const toneColors = (colors: AppColors): Record<Tone, string> => ({
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  inverse: colors.text.inverse,
  gold: colors.brand.goldDeep,
  up: colors.semantic.up,
  down: colors.semantic.down,
});

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  style,
  children,
  pointerEvents,
  ...rest
}: Props) {
  const base = typography[variant] as TextStyle;
  const { colors, fontFactor } = useTheme();
  const toneMap = toneColors(colors);
  // Uygulama içi yazı boyutu: varyant ve çağıranın verdiği fontSize/lineHeight birlikte ölçeklenir.
  const flat = StyleSheet.flatten([base, { color: toneMap[tone] }, style]) as TextStyle;
  const scaled: TextStyle =
    fontFactor === 1
      ? flat
      : {
          ...flat,
          fontSize: flat.fontSize != null ? flat.fontSize * fontFactor : undefined,
          lineHeight: flat.lineHeight != null ? flat.lineHeight * fontFactor : undefined,
        };
  return (
    <Text {...rest} pointerEvents={pointerEvents} style={scaled}>
      {children}
    </Text>
  );
}
