import { useHydrated } from '@/src/core/hooks/useHydrated';
import { useWindowDimensions } from 'react-native';

/**
 * `useWindowDimensions` yerine kullanılır: web'de sunucu pencereyi bilmez ve 0 ile çizer. Hydrate
 * bitene kadar sunucudakiyle aynı değer (0) döner, ardından gerçek boyuta geçilir. Aksi halde React
 * hydrate sırasında stil farkını düzeltmez ve sunucudaki `width: 0px` kalıcı olur (ör. paywall
 * içeriği görünmez). Native'de doğrudan gerçek boyut döner.
 */
export function useWindowSize(): { width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const hydrated = useHydrated();
  return hydrated ? { width, height } : { width: 0, height: 0 };
}
