import { getGoldAsset } from '@/src/core/constants/goldAssets';
import { getOtherAsset } from '@/src/core/constants/portfolioAssets';
import { useTheme } from '@/src/core/theme';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import React from 'react';
import { Text, View } from 'react-native';

/** Nakit rozeti; para birimine göre renk (TL kırmızı, dolar yeşil, euro mavi). */
const CASH_COLORS: Record<string, { fill: string; text: string }> = {
  TRY: { fill: '#F9E0DC', text: '#B42318' },
  USD: { fill: '#D8F0E3', text: '#1F7A4C' },
  EUR: { fill: '#DCE6F9', text: '#1F4FB4' },
};

type Props = { assetId: string; size?: number; maxWidth?: number };

/** Kasa varlığının ikonu: altın çeşidi, metal külçesi ya da para birimi rozeti. */
export function PortfolioAssetIcon({ assetId, size = 28, maxWidth }: Props) {
  const { scheme } = useTheme();
  const gold = getGoldAsset(assetId);
  if (gold) return <GoldAssetIcon asset={gold} size={size} maxWidth={maxWidth} />;
  const other = getOtherAsset(assetId);
  if (!other) return null;
  if (other.kind === 'metal') return <MetalIcon symbol={other.metal} size={size + 6} />;
  const palette = CASH_COLORS[other.currency] ?? CASH_COLORS.TRY;
  const badge = size + 6;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: badge,
        height: badge,
        borderRadius: badge / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.fill,
        opacity: scheme === 'dark' ? 0.92 : 1,
      }}
    >
      <Text style={{ color: palette.text, fontSize: badge * 0.5, fontWeight: '700' }}>{other.symbol}</Text>
    </View>
  );
}
