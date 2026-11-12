import { typography, useTheme } from '@/src/core/theme';
import React, { useEffect, useRef } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Değişimden sonra renk bu süre kalır, sonra normale döner. */
const FLASH_IN_MS = 120;
const FLASH_HOLD_MS = 700;
const FLASH_FADE_MS = 500;

type Props = {
  children: React.ReactNode;
  /** İzlenen sayı: yükselince yeşil, düşünce kırmızı yanar. */
  value: number | undefined;
  /** Değişince (ör. para birimi) önceki değerle karşılaştırılmaz, yanma olmaz. */
  resetKey?: string;
  variant?: keyof typeof typography;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

/**
 * Renk paylaşılan değerle canlandırılır; yanma için ek state ve yeniden çizim gerekmez.
 * Gösterilen metin `value`'dan farklı olabilir (ör. grafikte gezinirken seçili nokta).
 */
export function FlashingText({ children, value, resetKey, variant = 'body', style, numberOfLines }: Props) {
  const { colors } = useTheme();
  const flash = useSharedValue(0);
  const previous = useRef({ value, resetKey });

  useEffect(() => {
    const prev = previous.current;
    previous.current = { value, resetKey };
    if (value == null || prev.value == null || prev.resetKey !== resetKey || prev.value === value) return;
    flash.value = withSequence(
      withTiming(value > prev.value ? 1 : -1, { duration: FLASH_IN_MS }),
      withDelay(FLASH_HOLD_MS, withTiming(0, { duration: FLASH_FADE_MS })),
    );
  }, [value, resetKey, flash]);

  const up = colors.semantic.up;
  const down = colors.semantic.down;
  const neutral = colors.text.primary;
  const colorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(flash.value, [-1, 0, 1], [down, neutral, up]),
  }));

  return (
    <Animated.Text style={[typography[variant] as TextStyle, style, colorStyle]} numberOfLines={numberOfLines}>
      {children}
    </Animated.Text>
  );
}
