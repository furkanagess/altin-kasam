import { paddings } from '@/src/core/theme';
import { useAdColumn } from '@/src/core/theme/web';
import { WebAdSlot } from '@/src/widgets/organisms/WebAdSlot';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  /** Reklam kabının kimliği: `#ad-slot-<adId>`. */
  adId: string;
  /** İçeriğin en fazla genişliği (ör. ayarlar için okunabilir genişlik); verilmezse kalan alanı doldurur. */
  maxWidth?: number;
  children: ReactNode;
};

/**
 * Tek sütunlu sayfalar için: geniş web ekranında içerik sol menüye dayalı, sağda reklam sütunu.
 * Reklam sütunu gösterilmiyorsa (dar ekran, telefon, native) içerik olduğu gibi çizilir.
 */
export function WebAdLayout({ adId, maxWidth, children }: Props) {
  const showAd = useAdColumn();
  if (!showAd) return <>{children}</>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: paddings.xxl }}>
      <View style={{ flex: 1, minWidth: 0, maxWidth, gap: 16 }}>{children}</View>
      <View style={{ flex: maxWidth ? 1 : undefined, alignItems: 'flex-end' }}>
        <WebAdSlot id={adId} />
      </View>
    </View>
  );
}
