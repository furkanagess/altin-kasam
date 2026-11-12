import { HISTORY_POINTS, TIMEFRAME_SPAN_MS, type Currency, type Timeframe } from '@/src/core/constants/app';
import { HasfiyatMetalHistoryDatasource } from '@/src/data/datasources/hasfiyatMetalHistoryDatasource';
import type { IHistoryDatasource } from '@/src/data/datasources/marketDatasource';
import { PriceHistoryStore } from '@/src/data/datasources/priceHistoryStore';
import type { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint, FxRates, MetalQuote } from '@/src/domain/models';
import { fromTry } from '@/src/utils/currency';

/** Uzak geçmişin son noktası yerel fiyattan bundan fazla saparsa hizalanmaz. */
const MAX_LEVEL_GAP = 0.1;

function downsample(points: CandlePoint[], max: number): CandlePoint[] {
  if (points.length <= max) return [...points];
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/**
 * Geçmişin son noktası (saatlik barın kapanışı) güncel fiyatla tam örtüşmeyebilir; seri son
 * noktası güncel fiyata denk gelecek şekilde ölçeklenir.
 */
function alignToLevel(points: CandlePoint[], level: number | undefined): CandlePoint[] {
  const last = points[points.length - 1];
  if (!level || !last) return points;
  const factor = level / last.v;
  if (Math.abs(factor - 1) > MAX_LEVEL_GAP) return points;
  return points.map((p) => ({ t: p.t, v: Math.round(p.v * factor * 100) / 100 }));
}

/**
 * Metal grafiklerinin geçmişi: uzak seriden (`remoteHistory`), o yoksa cihazda biriken fiyat
 * örneklerinden çizilir. Seri, birincil fiyat kaynağının bildirdiği güncel seviyeye hizalanır.
 */
export class ChartHistoryDatasource {
  private readonly lastLive = new Map<MetalSymbol, MetalQuote>();
  private lastFx: FxRates = { TRY: 1 };

  constructor(
    private readonly history = new PriceHistoryStore(),
    private readonly remoteHistory: IHistoryDatasource = new HasfiyatMetalHistoryDatasource(),
  ) {}

  /** Grafiğin hizalandığı güncel fiyatı ve kuru günceller, cihaz geçmişine örnek ekler. */
  async remember(quotes: MetalQuote[], fxRates: FxRates): Promise<void> {
    for (const quote of quotes) this.lastLive.set(quote.symbol, quote);
    this.lastFx = { ...this.lastFx, ...fxRates };
    try {
      await this.history.record(quotes.map((q) => ({ symbol: q.symbol, point: { t: q.timestamp, v: q.bid } })));
    } catch {
      // Geçmiş kaydı başarısız olsa da canlı fiyat gösterilmeye devam eder.
    }
  }

  async fetchHistory(symbol: MetalSymbol, timeframe: Timeframe, currency: Currency): Promise<CandlePoint[]> {
    // Cihazdaki örnekler TRY'dir; uzak geçmiş yoksa güncel kurla çevrilir.
    const fromTryNow = (points: CandlePoint[]) =>
      currency === 'TRY' ? points : points.map((p) => ({ t: p.t, v: fromTry(p.v, currency, this.lastFx) }));

    const latest = this.lastLive.get(symbol);
    try {
      const remote = await this.remoteHistory.fetchHistory(symbol, timeframe, currency);
      if (remote.length >= 2) {
        const level = latest ? fromTry(latest.bid, currency, this.lastFx) : undefined;
        return alignToLevel(remote, level);
      }
    } catch {
      // Uzak geçmiş yoksa cihazdaki örneklere düş.
    }

    const samples = await this.history.since(symbol, Date.now() - TIMEFRAME_SPAN_MS[timeframe]);
    const series = downsample(samples, HISTORY_POINTS - 1);
    const lastPoint = series[series.length - 1];
    if (latest && (!lastPoint || latest.timestamp > lastPoint.t)) {
      series.push({ t: latest.timestamp, v: latest.bid });
    }
    return fromTryNow(series);
  }
}
