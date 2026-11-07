import { colors, typography } from '@/src/core/theme';
import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

type Variant = keyof typeof typography;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'gold' | 'up' | 'down';

const toneMap: Record<Tone, string> = {
  primary: colors.text.primary,
  secondary: colors.text.secondary,
  tertiary: colors.text.tertiary,
  inverse: colors.text.inverse,
  gold: colors.brand.goldDeep,
  up: colors.semantic.up,
  down: colors.semantic.down,
};

type Props = TextProps & {
  variant?: Variant;
  tone?: Tone;
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  style,
  children,
  ...rest
}: Props) {
  const base = typography[variant] as TextStyle;
  return (
    <Text {...rest} style={[base, { color: toneMap[tone] }, style]}>
      {children}
    </Text>
  );
}
