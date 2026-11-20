import { useWindowSize } from '@/src/core/hooks/useWindowSize';
import { useBreakpoint } from '@/src/core/theme/web/useBreakpoint';

/** Bu genişliğin altında reklam sütunu gösterilmez; içerik dar kalmasın. */
export const AD_COLUMN_MIN_WINDOW = 1600;

/**
 * Sayfanın sağında reklam sütunu gösterilsin mi: yalnızca geniş web ekranında ve pencere en az
 * 1600 px iken. Native'de ve telefonda her zaman `false` (hydrate'e kadar da `false`).
 */
export function useAdColumn(): boolean {
  const expanded = useBreakpoint() === 'expanded';
  const { width } = useWindowSize();
  return expanded && width >= AD_COLUMN_MIN_WINDOW;
}
