import { useTheme } from '@/src/core/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polygon, Rect } from 'react-native-svg';

export type FlagCountry = 'TR' | 'US';

const RED_TR = '#E30A17';
const RED_US = '#B22234';
const BLUE_US = '#3C3B6E';

/** Beş köşeli yıldızın köşe noktaları; `rotation` derece, 0 yukarı bakar. */
function starPoints(cx: number, cy: number, outer: number, inner: number, rotation: number): string {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = ((rotation + i * 36) * Math.PI) / 180;
    return `${(cx + r * Math.sin(angle)).toFixed(2)},${(cy - r * Math.cos(angle)).toFixed(2)}`;
  }).join(' ');
}

// Türk bayrağı oranları (TS 2001): hilal ve yıldız sola dönük; yıldızın bir köşesi hilale bakar.
const TR_STAR = starPoints(17.2, 10, 2.6, 1.05, -90);
const US_STRIPES = Array.from({ length: 7 }, (_, i) => i * 2);

/** Ülke bayrağı; sade çizim, küçük boyutta okunaklı olacak şekilde ayrıntıları azaltılmış. */
export function FlagIcon({ country, width = 22 }: { country: FlagCountry; width?: number }) {
  const { colors } = useTheme();
  const height = Math.round((width * 2) / 3);
  return (
    <View
      style={[styles.frame, { width, height, borderColor: colors.border.subtle }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height} viewBox="0 0 30 20">
        {country === 'TR' ? (
          <>
            <Rect width={30} height={20} fill={RED_TR} />
            <Circle cx={11.25} cy={10} r={5} fill="#FFFFFF" />
            <Circle cx={12.5} cy={10} r={4} fill={RED_TR} />
            <Polygon points={TR_STAR} fill="#FFFFFF" />
          </>
        ) : (
          <>
            <Rect width={30} height={20} fill="#FFFFFF" />
            {US_STRIPES.map((i) => (
              <Rect key={i} y={(i * 20) / 13} width={30} height={20 / 13} fill={RED_US} />
            ))}
            <Rect width={12} height={(20 * 7) / 13} fill={BLUE_US} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: 3, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
});
