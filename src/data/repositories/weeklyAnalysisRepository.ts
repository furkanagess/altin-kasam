import {
  RemoteWeeklyAnalysisDatasource,
  type IWeeklyAnalysisDatasource,
} from '@/src/data/datasources/weeklyAnalysisDatasource';
import type { WeeklyAnalysis } from '@/src/domain/models';

/** Analiz sekmesi ve detay ekranı aynı listeyi kullanır; her ekran açılışında yeniden indirilmez. */
const CACHE_MS = 10 * 60_000;

export class WeeklyAnalysisRepository {
  private cache: { at: number; items: WeeklyAnalysis[] } | null = null;

  constructor(private readonly datasource: IWeeklyAnalysisDatasource = new RemoteWeeklyAnalysisDatasource()) {}

  /** Yeniden eskiye. */
  async list(): Promise<WeeklyAnalysis[]> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.items;
    const items = [...(await this.datasource.list())].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    this.cache = { at: Date.now(), items };
    return items;
  }

  async get(id: string): Promise<WeeklyAnalysis | null> {
    return (await this.list()).find((a) => a.id === id) ?? null;
  }
}

export const weeklyAnalysisRepository = new WeeklyAnalysisRepository();
