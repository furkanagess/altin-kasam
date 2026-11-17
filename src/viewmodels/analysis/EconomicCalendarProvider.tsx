import { networkMonitor } from '@/src/core/network/networkMonitor';
import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';
import { useNetworkRecovery } from '@/src/viewmodels/network/useNetworkStatus';
import { economicCalendarRepository } from '@/src/data/repositories/economicCalendarRepository';
import type { EconomicEvent } from '@/src/domain/models';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';

/** Uygulama açıkken yenileme aralığı; sunucu yanıtı da 5 dk önbellekte. */
const REFRESH_MS = 5 * 60_000;
/** Sıradaki olay saatinden bu kadar sonra yenilenir: olay "Son açıklananlar"a geçer. */
const AFTER_EVENT_MS = 60_000;
/** Ön plana dönüşte, son yüklemeden bu süre geçtiyse yenilenir. */
const FOREGROUND_GAP_MS = 60_000;
/** `setTimeout` üst sınırı (~24,8 gün) aşılmasın; uzak olaylar için aralıklı yenileme yeter. */
const MAX_TIMER_MS = 24 * 60 * 60_000;

type EconomicCalendarContextValue = {
  /** Henüz açıklanmamış olaylar, yakından uzağa. */
  events: EconomicEvent[];
  /** Son üç haftada açıklananlar, yeniden eskiye; açıklanan değerle. */
  recent: EconomicEvent[];
  refresh: () => Promise<void>;
  loading: boolean;
  /** Takvim sunucudan alınamadı; ekranda yeniden deneme gösterilir. */
  error: boolean;
  reminders: ReadonlySet<string>;
  /** Cihaz yerel bildirim gösteremiyorsa (web, eski development build) hatırlatma düğmesi gizlenir. */
  remindersAvailable: boolean;
  toggleReminder: (event: EconomicEvent) => Promise<void>;
};

const EconomicCalendarContext = createContext<EconomicCalendarContextValue | null>(null);

/** Takvim hem Analiz sekmesinde hem takvim ekranında; hatırlatma durumu ikisinde de aynı kalır. */
export function EconomicCalendarProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [recent, setRecent] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reminders, setReminders] = useState<string[]>([]);

  const lastLoadAt = useRef(0);

  const load = useCallback(
    (isAlive: () => boolean = () => true) => {
      lastLoadAt.current = Date.now();
      return economicCalendarRepository
        .load()
        .then(async (calendar) => {
          const saved = await economicCalendarRepository.listReminders(calendar.upcoming);
          if (!isAlive()) return;
          setEvents(calendar.upcoming);
          setRecent(calendar.recent);
          setReminders(saved);
          setError(false);
        })
        .catch(() => {
          // Önceki liste varsa ekranda kalır.
          if (isAlive()) setError(true);
        })
        .finally(() => {
          if (isAlive()) setLoading(false);
        });
    },
    [],
  );

  // Açılışta, uygulama açıkken aralıklı ve ön plana dönüşte: yeni açıklanan sonuç kullanıcı
  // yenilemeden düşer.
  useEffect(() => {
    let alive = true;
    const isAlive = () => alive;
    let active = AppState.currentState !== 'background';
    load(isAlive).catch(() => undefined);
    const interval = setInterval(() => {
      if (active && !networkMonitor.isOffline()) load(isAlive).catch(() => undefined);
    }, REFRESH_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      const resumed = state === 'active' && !active;
      active = state === 'active';
      if (resumed && Date.now() - lastLoadAt.current > FOREGROUND_GAP_MS) load(isAlive).catch(() => undefined);
    });
    return () => {
      alive = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [load]);

  const nextEventAt = events.length ? Date.parse(events[0].at) : null;
  useEffect(() => {
    if (nextEventAt == null) return;
    const delay = nextEventAt + AFTER_EVENT_MS - Date.now();
    if (delay > MAX_TIMER_MS) return;
    let alive = true;
    const timer = setTimeout(() => load(() => alive).catch(() => undefined), Math.max(delay, 0));
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [nextEventAt, load]);

  const refresh = useCallback(() => load(), [load]);

  // Kopukluk bitince takvim kendiliğinden yenilenir.
  useNetworkRecovery(() => void load());

  const toggleReminder = useCallback(async (event: EconomicEvent) => {
    const result = await economicCalendarRepository.toggleReminder(event);
    setReminders(result.reminders);
    if (!result.ok) {
      const message =
        'Hatırlatma kurulamadı. Bildirim izni verilmemiş olabilir ya da açıklamaya çok az kaldı; izni Ayarlar’dan açabilirsin.';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Hatırlatma', message);
    }
  }, []);

  const value = useMemo(
    () => ({
      events,
      recent,
      refresh,
      loading,
      error,
      reminders: new Set(reminders),
      remindersAvailable: notificationsDatasource.isAvailable(),
      toggleReminder,
    }),
    [events, recent, refresh, loading, error, reminders, toggleReminder],
  );

  return <EconomicCalendarContext.Provider value={value}>{children}</EconomicCalendarContext.Provider>;
}

export function useEconomicCalendar(): EconomicCalendarContextValue {
  const ctx = useContext(EconomicCalendarContext);
  if (!ctx) throw new Error('useEconomicCalendar must be used within EconomicCalendarProvider');
  return ctx;
}
