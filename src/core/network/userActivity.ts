import { Platform } from 'react-native';

/**
 * Web'de "sekme açık ama kimse bakmıyor" durumunu algılar. Masaüstünde sayfa saatlerce görünür
 * kalabilir (ikinci ekran, unutulmuş sekme); `AppState` bunu arka plan saymaz ve yoklama günde
 * binlerce `/api/prices` isteği üretir. Son etkileşimden `WEB_IDLE_MS` sonra yoklama durur, ilk
 * fare/klavye/dokunma hareketinde `onResume` dinleyicileri hemen çalışır.
 *
 * Native'de her zaman etkin sayılır: ekran kilitlenince uygulama zaten arka plana düşer.
 */

/** Bu kadar süre etkileşim yoksa web yoklaması durur. */
export const WEB_IDLE_MS = 10 * 60_000;

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
/** `pointermove` gibi sık olaylarda zaman damgası en fazla bu aralıkla güncellenir. */
const THROTTLE_MS = 5_000;

let lastActiveAt = Date.now();
let started = false;
const resumeListeners = new Set<() => void>();

function isWeb(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined';
}

function markActive() {
  const now = Date.now();
  const wasIdle = now - lastActiveAt >= WEB_IDLE_MS;
  if (!wasIdle && now - lastActiveAt < THROTTLE_MS) return;
  lastActiveAt = now;
  if (wasIdle) resumeListeners.forEach((listener) => listener());
}

function ensureStarted() {
  if (started || !isWeb()) return;
  started = true;
  for (const event of EVENTS) window.addEventListener(event, markActive, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') markActive();
  });
}

/** Kullanıcı yakın zamanda etkileşimde bulundu mu (native'de her zaman `true`). */
export function isUserActive(now = Date.now()): boolean {
  if (!isWeb()) return true;
  ensureStarted();
  return now - lastActiveAt < WEB_IDLE_MS;
}

/** Boşta kalan web sekmesi yeniden kullanılınca çağrılır; aboneliği kaldıran fonksiyon döner. */
export function onUserResume(listener: () => void): () => void {
  ensureStarted();
  resumeListeners.add(listener);
  return () => {
    resumeListeners.delete(listener);
  };
}
