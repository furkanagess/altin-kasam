import {
  goldAssetShortName,
  gramGoldEquivalent,
  type GoldAssetDefinition,
} from '@/src/core/constants/goldAssets';
import { makeStyles, paddings, radii } from '@/src/core/theme';
import { GoldForm } from '@/src/domain/enums';
import { formatGrams, formatTRY } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { CardQuantityControl, type CardQuantity } from '@/src/widgets/molecules/CardQuantityControl';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import React, { memo } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  asset: GoldAssetDefinition;
  /** Birim satış fiyatı (TRY); yoksa fiyat satırı gizlenir. */
  price?: number;
  selected: boolean;
  onSelect: (assetId: string) => void;
  /** Yalnızca seçili kartta verilir; sağ üstte miktar kontrolü. */
  quantity?: CardQuantity;
};

function detailLine(asset: GoldAssetDefinition): string {
  if (asset.form === GoldForm.Gram || asset.form === GoldForm.Bilezik) return `${asset.karat} ayar`;
  return `≈ ${formatGrams(gramGoldEquivalent(asset.id))} altın`;
}

function GoldAssetCardBase({ asset, price, selected, onSelect, quantity }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => onSelect(asset.id)}
      style={[styles.card, selected && styles.selected]}
      role="radio"
      aria-checked={selected}
      aria-label={asset.label}
    >
      <View style={styles.icon}>
        <GoldAssetIcon asset={asset} size={30} />
      </View>
      <AppText variant="bodyStrong" numberOfLines={1}>
        {goldAssetShortName(asset)}
      </AppText>
      <AppText variant="caption" tone="tertiary" numberOfLines={1}>
        {detailLine(asset)}
      </AppText>
      {price ? (
        <AppText variant="caption" tone={selected ? 'gold' : 'secondary'} numberOfLines={1}>
          {formatTRY(price).replace(/,\d{2}$/, '')}
        </AppText>
      ) : null}
      {selected && quantity ? <CardQuantityControl {...quantity} /> : null}
    </Pressable>
  );
}

/** Seçim ızgarası saniyelik fiyat tikleriyle yeniden çizildiğinde değişmeyen kartlar atlanır. */
export const GoldAssetCard = memo(GoldAssetCardBase);

const useStyles = makeStyles((colors) => ({
  card: {
    // Yatay kaydırılan satırda sabit genişlik; dördüncü kartın kenarı görünür, kaydırılabildiği anlaşılır.
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
  icon: {
    height: 34,
    justifyContent: 'center',
    marginBottom: 4,
  },
}));
