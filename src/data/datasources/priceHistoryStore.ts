import { storageGet, storageSet } from '@/src/core/storage/storage';
import type { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';

const STORAGE_KEY = 'altin_kasam_price_history_v1';
const SAMPLE_GAP_MS = 5 * 60_000;
/** 5 dakikalık örneklerle yaklaşık 7 gün. */
const MAX_SAMPLES = 2_016;

type HistoryMap = Partial<Record<MetalSymbol, CandlePoint[]>>;

/** Geçmiş vermeyen sağlayıcılar için cihazda biriken fiyat örnekleri. */
export class PriceHistoryStore {
  private history: HistoryMap = {};
  private loading: Promise<void> | null = null;

  private load(): Promise<void> {
    this.loading ??= storageGet<HistoryMap>(STORAGE_KEY)
      .then((saved) => {
        this.history = saved ?? {};
      })
      .catch(() => {
        this.history = {};
      });
    return this.loading;
  }

  async record(samples: { symbol: MetalSymbol; point: CandlePoint }[]): Promise<void> {
    await this.load();
    let changed = false;
    for (const { symbol, point } of samples) {
      const series = this.history[symbol] ?? [];
      const last = series[series.length - 1];
      if (last && point.t - last.t < SAMPLE_GAP_MS) continue;
      series.push(point);
      if (series.length > MAX_SAMPLES) series.splice(0, series.length - MAX_SAMPLES);
      this.history[symbol] = series;
      changed = true;
    }
    if (changed) await storageSet(STORAGE_KEY, this.history);
  }

  async since(symbol: MetalSymbol, fromMs: number): Promise<CandlePoint[]> {
    await this.load();
    return (this.history[symbol] ?? []).filter((p) => p.t >= fromMs);
  }
}
