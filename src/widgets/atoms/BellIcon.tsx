import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function BellIcon({ color, filled = false, size = 18 }: { color: string; filled?: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
      <Path d="M10 20.5a2 2 0 0 0 4 0" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}
