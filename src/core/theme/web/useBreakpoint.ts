import { useHydrated } from '@/src/core/hooks/useHydrated';
import { breakpointFor, webLayout, type Breakpoint } from '@/src/core/theme/web/layout';
import { Platform, useWindowDimensions } from 'react-native';

const IS_WEB = Platform.OS === 'web';

/**
 * Geçerli ekran sınıfı. Native'de her zaman `compact` döner; web düzeni native'i asla etkilemez.
 * Sunucu pencere genişliğini bilmez: hydrate bitene kadar `compact` döner (sunucu çıktısıyla aynı),
 * ardından gerçek genişliğe geçilir.
 */
export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  const hydrated = useHydrated();
  return IS_WEB && hydrated ? breakpointFor(width) : 'compact';
}

/** Ekran sınıfına göre sayfa kenar boşluğu; `compact`'ta `undefined` (mobil boşluk geçerli). */
export function webGutter(bp: Breakpoint): number | undefined {
  return bp === 'compact' ? undefined : webLayout.gutter[bp];
}
