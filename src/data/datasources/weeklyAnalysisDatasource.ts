import { fetchJson } from '@/src/data/datasources/http';
import type { AnalysisOutlook, WeeklyAnalysis } from '@/src/domain/models';

export interface IWeeklyAnalysisDatasource {
  /** Yeniden eskiye sıralı olmak zorunda değildir; depo sıralar. */
  list(): Promise<WeeklyAnalysis[]>;
}

/**
 * Analizler uygulama paketinde değil, Firestore `weeklyAnalyses` koleksiyonundadır (Firebase
 * Console'dan elle girilir) ve `weeklyAnalyses` Cloud Function'ı ile `WeeklyAnalysis[]` olarak
 * sunulur; yeni hafta için uygulama güncellemesi gerekmez. Adres herkese açıktır (gizli anahtar
 * değil). Tanımlı değilse repodaki `firebase/public/weekly-analyses.json` dosyası sunucumuzdaki
 * `/api/weekly` ucundan okunur.
 */
const URL = process.env.EXPO_PUBLIC_WEEKLY_ANALYSIS_URL || '/api/weekly';
const TIMEOUT_MS = 10_000;
const DIRECTIONS: readonly AnalysisOutlook[] = ['up', 'down', 'neutral'];

const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Eksik ya da bozuk kayıt atlanır; bir hatalı hafta tüm listeyi düşürmez. */
function parse(raw: unknown): WeeklyAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (![a.id, a.weekStart, a.summary].every(isString)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.weekStart as string)) return null;
  const outlook = (Array.isArray(a.outlook) ? a.outlook : []).flatMap((o) => {
    const item = o as Record<string, unknown>;
    if ((item.metal !== 'gold' && item.metal !== 'silver') || !DIRECTIONS.includes(item.direction as AnalysisOutlook)) {
      return [];
    }
    return [
      {
        metal: item.metal as 'gold' | 'silver',
        direction: item.direction as AnalysisOutlook,
        note: isString(item.note) ? item.note : undefined,
      },
    ];
  });
  const levels = (Array.isArray(a.levels) ? a.levels : []).flatMap((l) => {
    const item = l as Record<string, unknown>;
    const support = isString(item.support) ? item.support : undefined;
    const resistance = isString(item.resistance) ? item.resistance : undefined;
    const value = isString(item.value) ? item.value : undefined;
    if (!isString(item.label) || (!support && !resistance && !value)) return [];
    return [{ label: item.label, support, resistance, value }];
  });
  const sections = (Array.isArray(a.sections) ? a.sections : []).flatMap((s) => {
    const item = s as Record<string, unknown>;
    return isString(item.title) && isString(item.comment) ? [{ title: item.title, comment: item.comment }] : [];
  });
  return {
    id: a.id as string,
    weekStart: a.weekStart as string,
    summary: a.summary as string,
    publishedAt: isString(a.publishedAt) ? a.publishedAt : `${a.weekStart as string}T07:00:00.000Z`,
    outlook,
    levels,
    sections,
  };
}

export class RemoteWeeklyAnalysisDatasource implements IWeeklyAnalysisDatasource {
  constructor(private readonly url: string = URL) {}

  async list(): Promise<WeeklyAnalysis[]> {
    if (!this.url) return [];
    const data = await fetchJson<unknown>(this.url, TIMEOUT_MS);
    const items = Array.isArray(data) ? data : [];
    return items.map(parse).filter((a): a is WeeklyAnalysis => a !== null);
  }
}
