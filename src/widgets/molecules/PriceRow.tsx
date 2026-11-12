import type { Currency } from '@/src/core/constants/app';
import { makeStyles, paddings, radii } from '@/src/core/theme';
import { formatMoney, formatPercent } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  name: string;
  caption?: string;
  price: number;
  currency: Currency;
  changePercent: number;
  /** Soldaki ikon; genişliği farklı ikonlar sabit bir alanda ortalanır, isimler hizalı kalır. */
  icon?: ReactNode;
  selected?: boolean;
  /** Verilmezse satır dokunulabilir değildir. */
  onPress?: () => void;
};

export function PriceRow({ name, caption, price, currency, changePercent, icon, selected, onPress }: Props) {
  const styles = useStyles();
  const up = changePercent >= 0;
  const content = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.left}>
        <AppText variant="bodyStrong">{name}</AppText>
        {caption ? (
          <AppText variant="caption" tone="tertiary">
            {caption}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText variant="bodyStrong">{formatMoney(price, currency)}</AppText>
        <Badge label={formatPercent(changePercent)} tone={up ? 'up' : 'down'} />
      </View>
    </>
  );

  if (!onPress) return <View style={[styles.row, selected && styles.selected]}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={[styles.row, selected && styles.selected]} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: paddings.card,
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 12,
  },
  selected: {
    borderColor: colors.brand.gold,
    backgroundColor: colors.surface.goldTint,
  },
  icon: { width: 64, alignItems: 'center', justifyContent: 'center' },
  left: { flex: 1, gap: 4 },
  right: { alignItems: 'flex-end', gap: 6 },
}));
