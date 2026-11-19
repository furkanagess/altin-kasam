import { useEffect, type RefObject } from 'react';
import { Platform } from 'react-native';

/**
 * Web'de bir görünümün genişliğini doğrudan tarayıcının `ResizeObserver`'ı ile izler.
 *
 * react-native-web'in `onLayout`'u bazı sarmalayıcıların (ör. RNGH `GestureDetector`) içinde,
 * düzen hızla değişirken (hydrate sonrası telefon → masaüstü geçişi, pencere boyutlandırma) ara bir
 * değeri bildirip son değeri gecikmeli verebiliyor; grafik o arada yanlış genişlikle çiziliyordu.
 * Native'de hiçbir şey yapmaz; orada `onLayout` güvenilirdir.
 */
export function useWebElementWidth(ref: RefObject<unknown>, onWidth: (width: number) => void) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof ResizeObserver === 'undefined') return;
    const element = ref.current as Element | null;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) onWidth(Math.round(width * 100) / 100);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, onWidth]);
}
