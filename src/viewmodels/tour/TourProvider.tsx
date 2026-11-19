import { TOUR_STEPS } from '@/src/core/constants/tour';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { tourRepository, type TourStatus } from '@/src/data/repositories/tourRepository';
import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { usePathname } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useBreakpoint } from '@/src/core/theme/web';

/** Ana ekran bu kadar süre kesintisiz açık kaldıysa tur başlar (arada paywall açılırsa sayaç sıfırlanır). */
const AUTO_START_DELAY_MS = 1500;

type TourContextValue = {
  active: boolean;
  stepIndex: number;
  stepCount: number;
  /** Onboarding bitince çağrılır: tur, ilk paywall kapandıktan sonra kendiliğinden başlar. */
  queue: () => void;
  /** Turu hemen baştan başlatır (Ayarlar). */
  start: () => void;
  next: () => void;
  back: () => void;
  /** Turu kapatır ve bir daha otomatik açmaz. */
  skip: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { loaded, onboardingDone } = useGoal();
  const pathname = usePathname();
  const [status, setStatus] = useState<TourStatus | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let alive = true;
    void tourRepository.getStatus().then((value) => {
      if (!alive) return;
      setStatus(value);
      setStatusLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const finish = useCallback((completed: boolean, atStep: number) => {
    setActive(false);
    setStatus('done');
    void tourRepository.setStatus('done');
    analyticsDatasource.track({ name: 'tour_finished', completed, step: atStep });
  }, []);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
    analyticsDatasource.track({ name: 'tour_started' });
  }, []);

  const queue = useCallback(() => {
    setStatus('pending');
    void tourRepository.setStatus('pending');
  }, []);

  // Onboarding ve ilk paywall bittikten sonra, kullanıcı ana ekranda durduğunda bir kez başlar.
  const homeOpen = pathname === '/' || pathname === '/index';
  // Tur telefon düzenini (alt sekmeler, yüzen buton) gösterir; geniş web ekranında başlamaz.
  const wideWeb = useBreakpoint() !== 'compact';
  useEffect(() => {
    if (wideWeb || !loaded || !statusLoaded || !onboardingDone || status !== 'pending' || active || !homeOpen) return;
    const timer = setTimeout(start, AUTO_START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [wideWeb, loaded, statusLoaded, onboardingDone, status, active, homeOpen, start]);

  const next = useCallback(() => {
    if (stepIndex >= TOUR_STEPS.length - 1) return finish(true, stepIndex);
    const target = stepIndex + 1;
    setStepIndex(target);
    analyticsDatasource.track({ name: 'tour_step', step: target });
  }, [stepIndex, finish]);

  const back = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);
  const skip = useCallback(() => finish(false, stepIndex), [finish, stepIndex]);

  const value = useMemo<TourContextValue>(
    () => ({ active, stepIndex, stepCount: TOUR_STEPS.length, queue, start, next, back, skip }),
    [active, stepIndex, queue, start, next, back, skip],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
