import type { Currency } from '@/src/core/constants/app';
import { getOtherAsset, portfolioQuantityUnit } from '@/src/core/constants/portfolioAssets';
import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import type { PortfolioPosition } from '@/src/domain/models';
import { formatMoney, formatNumber, formatPercent, formatSignedMoney } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { PortfolioAssetIcon } from '@/src/widgets/atoms/PortfolioAssetIcon';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const ICON_WIDTH = 40;

type Props = {
  position: PortfolioPosition;
  currency: Currency;
  onOpen: (position: PortfolioPosition) => void;
  /** Aynı birimden yeni alım. */
  onAddMore: (position: PortfolioPosition) => void;
  /** Birimin tüm alımlarını kasadan çıkarır. */
  onRemove: (position: PortfolioPosition) => void;
};

function IconButton({
  label,
  onPress,
  tone,
  path,
}: {
  label: string;
  onPress: () => void;
  tone: 'gold' | 'down';
  path: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tone === 'gold' ? colors.brand.goldDeep : colors.semantic.down;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.iconButton, tone === 'down' && styles.iconButtonDanger]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d={path} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const PLUS = 'M12 5v14M5 12h14';
const TRASH = 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2';

/** Kasadaki bir birim: toplam miktar, ortalama maliyet, değer ve maliyete göre kâr/zarar. */
export const HoldingListItem = memo(function HoldingListItem({
  position,
  currency,
  onOpen,
  onAddMore,
  onRemove,
}: Props) {
  const styles = useStyles();
  const other = getOtherAsset(position.assetId);
  const unit = portfolioQuantityUnit(position.assetId);
  const up = position.pnl >= 0;
  const purchases = position.holdings.length;
  const amount =
    other?.kind === 'cash' ? `${formatNumber(position.quantity)} ${other.symbol}` : `${formatNumber(position.quantity)} ${unit}`;
  const tryCash = other?.kind === 'cash' && other.currency === 'TRY';
  const detail = purchases > 1 ? `${amount} · ${purchases} alım` : amount;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onOpen(position)}
        style={styles.main}
        accessibilityRole="button"
        accessibilityLabel={`${position.label}, ${amount}, ${formatMoney(position.marketValue, currency)}`}
      >
        <View style={styles.icon}>
          <PortfolioAssetIcon assetId={position.assetId} size={24} maxWidth={ICON_WIDTH} />
        </View>
        <View style={styles.text}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {position.label}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {detail}
          </AppText>
          {tryCash ? null : (
            <AppText variant="caption" tone="tertiary" numberOfLines={1}>
              {`Ort. ${formatMoney(position.averageCost, currency)}`}
            </AppText>
          )}
        </View>
        <View style={styles.values}>
          <AppText variant="bodyStrong">{formatMoney(position.marketValue, currency)}</AppText>
          {tryCash ? null : (
            <AppText variant="caption" tone={up ? 'up' : 'down'}>
              {`${formatSignedMoney(position.pnl, currency)} (${formatPercent(position.pnlPercent)})`}
            </AppText>
          )}
        </View>
      </Pressable>
      <View style={styles.actions}>
        <IconButton label={`${position.label} ekle`} onPress={() => onAddMore(position)} tone="gold" path={PLUS} />
        <IconButton
          label={`${position.label} kasadan çıkar`}
          onPress={() => onRemove(position)}
          tone="down"
          path={TRASH}
        />
      </View>
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.xs,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  icon: { width: ICON_WIDTH, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  values: { alignItems: 'flex-end', gap: 2 },
  actions: { gap: 6 },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldTint,
  },
  iconButtonDanger: { backgroundColor: colors.semantic.downSoft },
}));
