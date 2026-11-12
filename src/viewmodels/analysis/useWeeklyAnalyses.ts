import { weeklyAnalysisRepository } from '@/src/data/repositories/weeklyAnalysisRepository';
import type { WeeklyAnalysis } from '@/src/domain/models';
import { useEffect, useState } from 'react';

/** Yayımlanmış haftalık analizler, yeniden eskiye. */
export function useWeeklyAnalyses() {
  const [analyses, setAnalyses] = useState<WeeklyAnalysis[] | null>(null);

  useEffect(() => {
    let alive = true;
    weeklyAnalysisRepository
      .list()
      .then((items) => {
        if (alive) setAnalyses(items);
      })
      .catch(() => {
        if (alive) setAnalyses([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { analyses: analyses ?? [], loading: analyses === null };
}
