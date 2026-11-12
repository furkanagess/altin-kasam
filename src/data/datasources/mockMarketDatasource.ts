import { HISTORY_POINTS, TIMEFRAME_SPAN_MS, type Timeframe } from '@/src/core/constants/app';
import type { IMarketDatasource } from '@/src/data/datasources/marketDatasource';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint, MarketQuotes } from '@/src/domain/models';

type Seed = {
  symbol: MetalSymbol;
  name: string;
  unit: string;
  base: number;
  volatility: number;
};

const SEEDS: Seed[] = [
  { symbol: MetalSymbol.XAU, name: 'Gram Altın (24)', unit: 'g', base: 4850, volatility: 0.004 },
  { symbol: MetalSymbol.XAG, name: 'Gümüş', unit: 'g', base: 58.4, volatility: 0.006 },
];

const state = new Map<MetalSymbol, { price: number; open: number }>();

function ensureState() {
  if (state.size) return;
  for (const seed of SEEDS) {
    state.set(seed.symbol, { price: seed.base, open: seed.base });
  }
}

function walk(seed: Seed): number {
  ensureState();
  const current = state.get(seed.symbol)!;
  const delta = (Math.random() - 0.48) * seed.volatility * current.price;
  current.price = Math.max(current.price + delta, seed.base * 0.7);
  state.set(seed.symbol, current);
  return current.price;
}

export class MockMarketDatasource implements IMarketDatasource {
  async fetchQuotes(): Promise<MarketQuotes> {
    ensureState();
    const now = Date.now();
    const quotes = SEEDS.map((seed) => {
      const bid = walk(seed);
      const open = state.get(seed.symbol)!.open;
      const changePercent = ((bid - open) / open) * 100;
      return {
        symbol: seed.symbol,
        name: seed.name,
        unit: seed.unit,
        bid: Number(bid.toFixed(2)),
        ask: Number((bid * 1.002).toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        currency: 'TRY' as const,
        timestamp: now,
        source: 'simulated' as const,
      };
    });
    return { quotes, goldRates: [], fxRates: { TRY: 1 } };
  }

  /** Kur bilgisi olmadığından her zaman TRY üretir. */
  async fetchHistory(symbol: MetalSymbol, timeframe: Timeframe): Promise<CandlePoint[]> {
    ensureState();
    const seed = SEEDS.find((s) => s.symbol === symbol) ?? SEEDS[0];
    const current = state.get(seed.symbol)?.price ?? seed.base;
    const step = TIMEFRAME_SPAN_MS[timeframe] / HISTORY_POINTS;
    const points: CandlePoint[] = [];
    let cursor = current * (1 - seed.volatility * 8);
    const now = Date.now();
    for (let i = 0; i < HISTORY_POINTS; i += 1) {
      cursor += (Math.random() - 0.45) * seed.volatility * cursor;
      points.push({
        t: now - (HISTORY_POINTS - i) * step,
        v: Number(cursor.toFixed(2)),
      });
    }
    points[points.length - 1] = { t: now, v: Number(current.toFixed(2)) };
    return points;
  }
}
