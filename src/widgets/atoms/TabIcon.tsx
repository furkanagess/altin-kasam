import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabIconName = 'portfolio' | 'market' | 'community' | 'analysis';

type Props = {
  name: TabIconName;
  color: ColorValue;
  /** Seçili sekmede şekil hafif dolgulu çizilir. */
  focused: boolean;
  size?: number;
};

const FILL_OPACITY = 0.18;

export function TabIcon({ name, color, focused, size = 24 }: Props) {
  const fill = focused ? color : 'none';
  const stroke = {
    stroke: color,
    strokeWidth: focused ? 2.2 : 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'portfolio' ? (
        // Kasa: gövde, kilit kadranı, kol ve ayaklar.
        <>
          <Rect x={3} y={4} width={18} height={15} rx={2.5} fill={fill} fillOpacity={FILL_OPACITY} {...stroke} />
          <Circle cx={11} cy={11.5} r={3.5} fill="none" {...stroke} />
          <Circle cx={11} cy={11.5} r={0.6} fill={color} />
          <Path d="M17.5 9.5v4" {...stroke} />
          <Path d="M6.5 19v1.8M17.5 19v1.8" {...stroke} />
        </>
      ) : null}
      {name === 'market' ? (
        // Yükselen fiyat grafiği.
        <>
          {focused ? (
            <Path d="M4 16.5l5-5 4 3 7-7V20H4Z" fill={color} fillOpacity={FILL_OPACITY} />
          ) : null}
          <Path d="M3 20h18" {...stroke} />
          <Path d="M4 16.5l5-5 4 3 7-7" fill="none" {...stroke} />
          <Path d="M15 7.5h5v5" fill="none" {...stroke} />
        </>
      ) : null}
      {name === 'community' ? (
        // Biri öne biri arkaya iki konuşma balonu.
        <>
          <Path
            d="M18.5 8.5h1A2.5 2.5 0 0 1 22 11v4.5a2.5 2.5 0 0 1-2.5 2.5H19v2.5L16 18h-3.5"
            fill="none"
            {...stroke}
          />
          <Path
            d="M4 4.5h10a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5H9.5L5.5 18v-3.5H4A2.5 2.5 0 0 1 1.5 12V7A2.5 2.5 0 0 1 4 4.5Z"
            fill={fill}
            fillOpacity={FILL_OPACITY}
            {...stroke}
          />
        </>
      ) : null}
      {name === 'analysis' ? (
        // Rapor sayfası üzerinde sütun grafik.
        <>
          <Rect x={3.5} y={3} width={17} height={18} rx={2.5} fill={fill} fillOpacity={FILL_OPACITY} {...stroke} />
          <Path d="M8 17v-4M12 17V8M16 17v-6" fill="none" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
}
