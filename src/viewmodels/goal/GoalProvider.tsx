import { goalRepository } from '@/src/data/repositories/goalRepository';
import type { InvestmentGoal } from '@/src/domain/models';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type GoalContextValue = {
  /** Depodan okuma bitene kadar false; ilk açılış yönlendirmesi bunu bekler. */
  loaded: boolean;
  onboardingDone: boolean;
  goal: InvestmentGoal | null;
  saveGoal: (goal: Omit<InvestmentGoal, 'createdAt'>) => Promise<void>;
  clearGoal: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

const GoalContext = createContext<GoalContextValue | null>(null);

export function GoalProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [goal, setGoal] = useState<InvestmentGoal | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([goalRepository.getGoal(), goalRepository.isOnboardingDone()])
      .then(([savedGoal, done]) => {
        if (!alive) return;
        setGoal(savedGoal);
        setOnboardingDone(done);
      })
      .catch(() => {
        // Okunamazsa karşılama ekranı yeniden gösterilir; veri kaybı olmaz.
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const saveGoal = useCallback(async (next: Omit<InvestmentGoal, 'createdAt'>) => {
    const value: InvestmentGoal = { ...next, createdAt: new Date().toISOString() };
    await goalRepository.saveGoal(value);
    setGoal(value);
  }, []);

  const clearGoal = useCallback(async () => {
    await goalRepository.clearGoal();
    setGoal(null);
  }, []);

  const completeOnboarding = useCallback(async () => {
    await goalRepository.completeOnboarding();
    setOnboardingDone(true);
  }, []);

  const value = useMemo(
    () => ({ loaded, onboardingDone, goal, saveGoal, clearGoal, completeOnboarding }),
    [loaded, onboardingDone, goal, saveGoal, clearGoal, completeOnboarding],
  );

  return <GoalContext.Provider value={value}>{children}</GoalContext.Provider>;
}

export function useGoal(): GoalContextValue {
  const ctx = useContext(GoalContext);
  if (!ctx) {
    throw new Error('useGoal must be used within GoalProvider');
  }
  return ctx;
}
