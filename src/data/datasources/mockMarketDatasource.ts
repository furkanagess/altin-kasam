import { HISTORY_POINTS, type Timeframe } from '@/src/core/constants/app';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint, MetalQuote } from '@/src/domain/models';

type Seed = {
  symbol: MetalSymbol;
  name: string;
  unit: string;
  base: number;
  volatility: number;
};

const SEEDS: Seed[] = [
  { symbol: MetalSymbol.XAU, name: 'Gram Altın (24)', unit: 'TRY/g', base: 4850, volatility: 0.004 },
  { symbol: MetalSymbol.XAG, name: 'Gümüş', unit: 'TRY/g', base: 58.4, volatility: 0.006 },
  { symbol: MetalSymbol.XCU, name: 'Bakır', unit: 'TRY/kg', base: 412, volatility: 0.005 },
  { symbol: MetalSymbol.XPT, name: 'Platin', unit: 'TRY/g', base: 1620, volatility: 0.005 },
  { symbol: MetalSymbol.OIL, name: 'Brent Petrol', unit: 'TRY/varil', base: 2680, volatility: 0.008 },
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

export interface IMarketDatasource {
  fetchQuotes(): Promise<MetalQuote[]>;
  fetchHistory(symbol: MetalSymbol, timeframe: Timeframe): Promise<CandlePoint[]>;
}

export class MockMarketDatasource implements IMarketDatasource {
  async fetchQuotes(): Promise<MetalQuote[]> {
    ensureState();
    const now = Date.now();
    return SEEDS.map((seed) => {
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
      };
    });
  }

  async fetchHistory(symbol: MetalSymbol, timeframe: Timeframe): Promise<CandlePoint[]> {
    ensureState();
    const seed = SEEDS.find((s) => s.symbol === symbol) ?? SEEDS[0];
    const current = state.get(seed.symbol)?.price ?? seed.base;
    const spanMs: Record<Timeframe, number> = {
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
      '1M': 30 * 24 * 60 * 60 * 1000,
      '1Y': 365 * 24 * 60 * 60 * 1000,
    };
    const step = spanMs[timeframe] / HISTORY_POINTS;
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
