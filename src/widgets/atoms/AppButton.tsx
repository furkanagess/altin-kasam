import { makeStyles, paddings, radii, typography, useTheme, type AppColors } from '@/src/core/theme';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const labelColors = (colors: AppColors): Record<Variant, string> => ({
  primary: colors.text.onGold,
  secondary: colors.brand.goldDeep,
  ghost: colors.brand.goldDeep,
  danger: colors.semantic.down,
});

export function AppButton({
  label,
  variant = 'primary',
  loading,
  disabled,
  style,
  onPress,
  ...rest
}: Props) {
  const styles = useStyles();
  const { colors, fontFactor } = useTheme();
  const labelColor = labelColors(colors);
  // Buton metni de yazı boyutu tercihine uyar.
  const labelScale = {
    fontSize: typography.bodyStrong.fontSize * fontFactor,
    lineHeight: typography.bodyStrong.lineHeight * fontFactor,
  };
  const isDisabled = Boolean(disabled || loading);

  const handlePress = (event?: GestureResponderEvent) => {
    if (isDisabled) return;
    onPress?.(event as GestureResponderEvent);
  };

  if (Platform.OS === 'web') {
    const flat = StyleSheet.flatten([
      styles.base,
      styles[variant],
      isDisabled && styles.disabled,
      styles.webCursor,
      style,
    ]) as Record<string, unknown>;

    return (
      // Native <button> is more reliable for automation / web clicks than RN Pressable.
      <button
        type="button"
        disabled={isDisabled}
        aria-label={label}
        onClick={() => handlePress()}
        style={{
          ...flat,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: flat.borderWidth ? Number(flat.borderWidth) : 0,
          borderStyle: 'solid',
          borderColor: (flat.borderColor as string) ?? 'transparent',
          fontFamily: 'inherit',
        }}
      >
        {loading ? (
          <ActivityIndicator color={labelColor[variant]} />
        ) : (
          <Text style={[typography.bodyStrong, labelScale, { color: labelColor[variant] }]}>
            {label}
          </Text>
        )}
      </button>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      hitSlop={8}
      onPress={handlePress}
      style={(state) => [
        styles.base,
        styles[variant],
        state.pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={labelColor[variant]} />
      ) : (
        <Text
          pointerEvents="none"
          style={[typography.bodyStrong, labelScale, { color: labelColor[variant] }]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
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
}));
