import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Sunucu çıktısı ve hydrate sırasında `false`, hemen ardından `true`. Web'de sunucunun bilemediği
 * değerler (pencere genişliği, sistem teması) hydrate bitene kadar sunucudaki gibi çizilir; böylece
 * React'in "hydration mismatch" hatası oluşmaz ve fark sonraki çizimde düzgünce uygulanır.
 * Native'de sunucu çıktısı olmadığı için her zaman `true` döner.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
