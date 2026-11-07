import { APP_NAME, APP_TAGLINE } from '@/src/core/constants/app';
import { colors, paddings, radii } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  live?: boolean;
  stale?: boolean;
};

export function BrandHeader({ live, stale }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.brandMark} />
      <View style={styles.copy}>
        <AppText variant="brand">{APP_NAME}</AppText>
        <AppText variant="caption" tone="secondary">
          {APP_TAGLINE}
        </AppText>
      </View>
      {stale ? <Badge label="Eski veri" tone="warning" /> : null}
      {live && !stale ? <Badge label="Canlı" tone="up" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: paddings.xs,
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.brand.gold,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
