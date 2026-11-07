import { colors, paddings, radii, typography } from '@/src/core/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';

type Tone = 'neutral' | 'up' | 'down' | 'gold' | 'warning';

const map: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surface.muted, fg: colors.text.secondary },
  up: { bg: colors.semantic.upSoft, fg: colors.semantic.up },
  down: { bg: colors.semantic.downSoft, fg: colors.semantic.down },
  gold: { bg: colors.brand.goldSoft, fg: colors.brand.goldDeep },
  warning: { bg: '#F8E7C9', fg: colors.semantic.warning },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const c = map[tone];
  return (
    <View style={[styles.base, { backgroundColor: c.bg }]}>
      <AppText variant="caption" style={{ color: c.fg, ...typography.caption }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: paddings.xs,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
});
