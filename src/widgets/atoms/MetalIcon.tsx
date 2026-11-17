import { useTheme } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path, Polygon } from 'react-native-svg';

/** Külçe çizimi iki temada da aynıdır; yalnızca rozet zemini temaya uyar. */
const PALETTE: Record<MetalSymbol, { fill: string; edge: string; shine: string }> = {
  [MetalSymbol.XAU]: { fill: '#E3B23C', edge: '#9A6B12', shine: '#FBE7A1' },
  [MetalSymbol.XAG]: { fill: '#C9CED6', edge: '#6F7886', shine: '#F4F6F9' },
  // Platin gümüşten daha mavimsi ve koyu, paladyum sıcak gri.
  [MetalSymbol.XPT]: { fill: '#AEB8C4', edge: '#4F5B69', shine: '#E6ECF2' },
  [MetalSymbol.XPD]: { fill: '#BDB5A8', edge: '#665D50', shine: '#EEE9E1' },
};

type Props = {
  symbol: MetalSymbol;
  /** Rozetin çapı (px). */
  size?: number;
};

/** Metal başına renkli külçe rozeti; grafik ve fiyat başlıklarında kullanılır. */
export function MetalIcon({ symbol, size = 36 }: Props) {
  const { colors } = useTheme();
  const { fill, edge, shine } = PALETTE[symbol];
  const background = symbol === MetalSymbol.XAU ? colors.surface.goldBadge : colors.surface.silverBadge;
  const icon = size * 0.72;
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={icon} height={icon} viewBox="4 10 38 32">
        <G>
          {/* Arkadaki ikinci külçe, rozete derinlik verir. */}
          <Polygon points="12,28 40,28 35,12 17,12" fill={fill} stroke={edge} strokeWidth={2} strokeLinejoin="round" opacity={0.55} />
          <Polygon points="6,40 38,40 32,22 12,22" fill={fill} stroke={edge} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="12,22 32,22 30,27 14,27" fill={shine} opacity={0.9} />
          <Path d="M11 36 H33" stroke={edge} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
        </G>
      </Svg>
    </View>
  );
}

/** Brent petrol rozeti: koyu zeminde damla. */
export function OilIcon({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  const icon = size * 0.6;
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface.silverBadge }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={icon} height={icon} viewBox="0 0 24 24">
        <Path d="M12 2.5 C12 2.5 5 10.2 5 15 a7 7 0 0 0 14 0 C19 10.2 12 2.5 12 2.5 Z" fill="#2B2F36" stroke="#111418" strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M9 15.5 a3 3 0 0 0 2.2 2.9" stroke="#8A93A0" strokeWidth={1.6} strokeLinecap="round" fill="none" />
      </Svg>
    </View>
  );
}

/** Altın/Gümüş rasyosu rozeti: arkada altın, önde gümüş külçe. */
export function GoldSilverRatioIcon({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  const gold = PALETTE[MetalSymbol.XAU];
  const silver = PALETTE[MetalSymbol.XAG];
  const icon = size * 0.72;
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface.goldBadge }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={icon} height={icon} viewBox="4 10 38 32">
        <G>
          <Polygon points="6,30 30,30 26,16 10,16" fill={gold.fill} stroke={gold.edge} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="10,16 26,16 25,20 11,20" fill={gold.shine} opacity={0.9} />
          <Polygon points="16,40 42,40 37,25 21,25" fill={silver.fill} stroke={silver.edge} strokeWidth={2} strokeLinejoin="round" />
          <Polygon points="21,25 37,25 36,29 22,29" fill={silver.shine} opacity={0.9} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
});
