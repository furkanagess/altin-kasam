import { gramGoldEquivalent } from '@/src/core/constants/goldAssets';
import { storageGet, storageRemove, storageSet } from '@/src/core/storage/storage';
import type { GoalProgress, Holding, InvestmentGoal } from '@/src/domain/models';

/** v1 TL tutarıydı; gram hedefine geçişte eski kayıt yok sayılır. */
const GOAL_KEY = 'altin_kasam_goal_v2';
const ONBOARDING_KEY = 'altin_kasam_onboarding_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Dönem sınırları cihazın yerel saatine göre (ay/yıl başı gece yarısı). */
function periodBounds(goal: InvestmentGoal, now: Date): { start: number; end: number } {
  const year = now.getFullYear();
  if (goal.period === 'yearly') {
    return { start: new Date(year, 0, 1).getTime(), end: new Date(year + 1, 0, 1).getTime() };
  }
  const month = now.getMonth();
  return { start: new Date(year, month, 1).getTime(), end: new Date(year, month + 1, 1).getTime() };
}

export class GoalRepository {
  async getGoal(): Promise<InvestmentGoal | null> {
    const goal = await storageGet<InvestmentGoal>(GOAL_KEY);
    return goal && goal.grams > 0 ? goal : null;
  }

  async saveGoal(goal: InvestmentGoal): Promise<void> {
    await storageSet(GOAL_KEY, goal);
  }

  async clearGoal(): Promise<void> {
    await storageRemove(GOAL_KEY);
  }

  async isOnboardingDone(): Promise<boolean> {
    return (await storageGet<boolean>(ONBOARDING_KEY)) === true;
  }

  async completeOnboarding(): Promise<void> {
    await storageSet(ONBOARDING_KEY, true);
  }

  /** İlerleme, dönem içinde kasaya eklenen altının 24 ayar gram karşılığından hesaplanır. */
  computeProgress(goal: InvestmentGoal, holdings: Holding[], now = new Date()): GoalProgress {
    const { start, end } = periodBounds(goal, now);
    const inPeriod = holdings.filter((h) => {
      const t = Date.parse(h.boughtAt);
      return t >= start && t < end;
    });
    const gramsAdded = inPeriod.reduce((sum, h) => sum + gramGoldEquivalent(h.assetId) * h.quantity, 0);
    const spent = inPeriod.reduce((sum, h) => sum + h.costBasisPerUnit * h.quantity, 0);
    const elapsed = Math.min(Math.max((now.getTime() - start) / (end - start), 0), 1);
    return {
      goal,
      periodStart: start,
      periodEnd: end,
      gramsAdded,
      expectedGrams: goal.grams * elapsed,
      remainingGrams: Math.max(goal.grams - gramsAdded, 0),
      ratio: goal.grams > 0 ? gramsAdded / goal.grams : 0,
      daysLeft: Math.max(Math.ceil((end - now.getTime()) / DAY_MS), 0),
      purchases: inPeriod.length,
      spent,
    };
  }
}

export const goalRepository = new GoalRepository();
