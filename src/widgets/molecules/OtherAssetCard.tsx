import type { OtherAssetDefinition } from '@/src/core/constants/portfolioAssets';
import { makeStyles, paddings, radii } from '@/src/core/theme';
import { formatTRY } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { CardQuantityControl, type CardQuantity } from '@/src/widgets/molecules/CardQuantityControl';
import { PortfolioAssetIcon } from '@/src/widgets/atoms/PortfolioAssetIcon';
import React, { memo } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  asset: OtherAssetDefinition;
  /** Metalde gram satış fiyatı, nakitte kur (TRY); TL'de gösterilmez. */
  price?: number;
  selected: boolean;
  onSelect: (assetId: string) => void;
  /** Yalnızca seçili kartta verilir; sağ üstte miktar kontrolü. */
  quantity?: CardQuantity;
};

/** Ekleme ekranında metal ve nakit seçimi; altın kartıyla aynı ölçü ve düzen. */
function OtherAssetCardBase({ asset, price, selected, onSelect, quantity }: Props) {
  const styles = useStyles();
  const detail = asset.kind === 'metal' ? 'gram' : asset.currency;
  return (
    <Pressable
      onPress={() => onSelect(asset.id)}
      style={[styles.card, selected && styles.selected]}
      role="radio"
      aria-checked={selected}
      aria-label={asset.label}
    >
      <View style={styles.icon}>
        <PortfolioAssetIcon assetId={asset.id} size={26} />
      </View>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {asset.shortName}
      </AppText>
      <AppText variant="caption" tone="tertiary" numberOfLines={1}>
        {detail}
      </AppText>
      {price ? (
        <AppText variant="caption" tone={selected ? 'gold' : 'secondary'} numberOfLines={1}>
          {formatTRY(price)}
        </AppText>
      ) : null}
      {selected && quantity ? <CardQuantityControl {...quantity} /> : null}
    </Pressable>
  );
}

export const OtherAssetCard = memo(OtherAssetCardBase);

const useStyles = makeStyles((colors) => ({
  card: {
    width: 112,
    gap: 2,
    paddingHorizontal: paddings.xxs,
    paddingBottom: paddings.xs,
    // Üstte seçili kartın miktar kontrolüne yer; seçim değişince kart boyu oynamaz.
    paddingTop: paddings.sm + 18,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
  },
  selected: {
    borderColor: colors.brand.gold,
    backgroundColor: colors.surface.goldTint,
  },
  icon: { height: 34, justifyContent: 'center', marginBottom: 4 },
}));
