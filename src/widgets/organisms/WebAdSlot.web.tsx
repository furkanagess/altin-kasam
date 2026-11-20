import { paddings } from '@/src/core/theme';
import React from 'react';
import { View, type ViewStyle } from 'react-native';

type Props = {
  /** Reklam ağının (ör. Google AdSense) birimi bu kimlikle bu kaba yerleştirilir: `#ad-slot-<id>`. */
  id: string;
  width?: number;
  height?: number;
};

/**
 * Web reklam alanı: şimdilik yalnızca yer ayırır (boş, görünmez kap). AdMob web'de çalışmaz; web
 * sitesi için Google AdSense (ya da benzeri) birimi bu kaba eklenir. Sayfa kayarken üstte kalır.
 * Standart dikey birim 300×600 ("half page").
 */
export function WebAdSlot({ id, width = 300, height = 600 }: Props) {
  const style = {
    width,
    minHeight: height,
    position: 'sticky',
    top: paddings.sm,
  } as unknown as ViewStyle;
  return <View nativeID={`ad-slot-${id}`} style={style} aria-hidden />;
}
