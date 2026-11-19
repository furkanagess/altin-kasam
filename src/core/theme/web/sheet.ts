import { paddings } from '@/src/core/theme/paddings';
import { radii } from '@/src/core/theme/radii';
import { webLayout } from '@/src/core/theme/web/layout';
import { useBreakpoint } from '@/src/core/theme/web/useBreakpoint';
import type { ViewStyle } from 'react-native';

const WIDE_ROOT: ViewStyle = { justifyContent: 'center', alignItems: 'center', padding: paddings.xxl };
const WIDE_SHEET: ViewStyle = {
  width: '100%',
  maxWidth: webLayout.dialog.sm,
  borderRadius: radii.lg,
  paddingTop: paddings.lg,
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.32)',
};

/**
 * Alttan açılan paneller (filtre, bilgi) geniş web ekranında ortalanmış pencere olur: tutamaç ve
 * alttan kayma animasyonu yoktur. Telefonda ve native'de stiller boş döner, panel değişmez.
 */
export function useSheetPresentation() {
  const wide = useBreakpoint() !== 'compact';
  return {
    wide,
    rootStyle: wide ? WIDE_ROOT : null,
    sheetStyle: wide ? WIDE_SHEET : null,
  };
}
