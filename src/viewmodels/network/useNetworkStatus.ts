import { networkMonitor, type NetworkStatus } from '@/src/core/network/networkMonitor';
import { useEffect, useRef, useSyncExternalStore } from 'react';

/** Güncel ağ durumu: çevrimiçi / zayıf / çevrimdışı. Yalnızca durum değişince yeniden çizer. */
export function useNetworkStatus(): NetworkStatus {
  return useSyncExternalStore(networkMonitor.subscribe, networkMonitor.getStatus, networkMonitor.getStatus);
}

/**
 * Bağlantı geri geldiğinde (ya da kullanıcı "Tekrar dene"ye bastığında) `callback` çağrılır.
 * Veri sağlayıcıları bununla kopukluk sırasında kaçırdıkları veriyi kullanıcı yenilemeden çeker.
 * Callback her render'da değişebilir; abonelik yenilenmez.
 */
export function useNetworkRecovery(callback: () => void) {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useEffect(() => networkMonitor.onRecover(() => latest.current()), []);
}
