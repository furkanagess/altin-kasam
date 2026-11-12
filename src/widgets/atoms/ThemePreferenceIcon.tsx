import type { ThemePreference } from '@/src/core/theme';
import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** Görünüm seçimi ikonları: sistem (yarı dolu daire), açık (güneş), koyu (ay). */
export function ThemePreferenceIcon({
  preference,
  color,
  size = 24,
}: {
  preference: ThemePreference;
  color: string;
  size?: number;
}) {
  const stroke = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {preference === 'system' ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...stroke} />
          <Path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill={color} />
        </>
      ) : null}
      {preference === 'light' ? (
        <>
          <Circle cx={12} cy={12} r={4} {...stroke} />
          <Path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
            {...stroke}
          />
        </>
      ) : null}
      {preference === 'dark' ? (
        <Path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" {...stroke} />
      ) : null}
    </Svg>
  );
}
