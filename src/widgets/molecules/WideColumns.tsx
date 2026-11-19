import { paddings } from '@/src/core/theme';
import { useBreakpoint } from '@/src/core/theme/web';
import React, { type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

type Props = {
  /** Ana içerik (sol, geniş sütun). */
  main: ReactNode;
  /** Yan içerik (sağ, sabit genişlikli sütun). */
  aside: ReactNode;
  asideWidth?: number;
  /** Yan sütun sayfa kayarken üstte kalır (web). */
  stickyAside?: boolean;
  /** Sütun içi öğeler arası boşluk; `Screen` içeriğindeki boşlukla aynı (16). */
  gap?: number;
};

const COLUMN_GAP = paddings.xxl;

/**
 * Masaüstü web'de (`expanded`) iki sütunlu düzen. Daha dar ekranlarda ve native'de iki parça
 * alt alta, bugünkü sırayla çizilir; ekranın telefon görünümü değişmez.
 */
export function WideColumns({ main, aside, asideWidth = 400, stickyAside, gap = 16 }: Props) {
  const expanded = useBreakpoint() === 'expanded';
  if (!expanded) {
    return (
      <>
        {main}
        {aside}
      </>
    );
  }
  const asideStyle: ViewStyle = { width: asideWidth, gap };
  if (stickyAside) Object.assign(asideStyle, { position: 'sticky', top: paddings.sm } as unknown as ViewStyle);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: COLUMN_GAP }}>
      <View style={{ flex: 1, minWidth: 0, gap }}>{main}</View>
      <View style={asideStyle}>{aside}</View>
    </View>
  );
}
