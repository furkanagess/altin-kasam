import { colors, paddings, radii } from '@/src/core/theme';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return (
    <View style={styles.box}>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" tone="secondary">
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 10,
    padding: paddings.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
});
