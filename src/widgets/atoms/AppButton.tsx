import { colors, paddings, radii } from '@/src/core/theme';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function AppButton({
  label,
  variant = 'primary',
  loading,
  disabled,
  style,
  onPress,
  ...rest
}: Props) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      hitSlop={8}
      onPress={isDisabled ? undefined : onPress}
      style={(state) => {
        const extra = typeof style === 'function' ? style(state) : style;
        return [
          styles.base,
          styles[variant],
          state.pressed && styles.pressed,
          isDisabled && styles.disabled,
          Platform.OS === 'web' ? styles.webCursor : null,
          extra as ViewStyle,
        ];
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.text.onGold : colors.brand.gold}
        />
      ) : (
        <AppText
          variant="bodyStrong"
          pointerEvents="none"
          tone={variant === 'primary' ? 'primary' : variant === 'danger' ? 'down' : 'gold'}
          style={variant === 'primary' ? { color: colors.text.onGold } : undefined}
        >
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: paddings.lg,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.brand.gold,
  },
  secondary: {
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.semantic.downSoft,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.5,
  },
  webCursor: {
    cursor: 'pointer',
  } as ViewStyle,
});

