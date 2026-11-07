import type { Timeframe } from '@/src/core/constants/app';
import type {
  CommunityPostKind,
  MetalSymbol,
} from '@/src/domain/enums';

export type MetalQuote = {
  symbol: MetalSymbol;
  name: string;
  unit: string;
  bid: number;
  ask: number;
  changePercent: number;
  currency: 'TRY';
  timestamp: number;
};

export type CandlePoint = {
  t: number;
  v: number;
};

export type MarketSnapshot = {
  quotes: MetalQuote[];
  updatedAt: number;
  stale: boolean;
};

export type ChartSeries = {
  symbol: MetalSymbol;
  timeframe: Timeframe;
  points: CandlePoint[];
};

export type Holding = {
  id: string;
  assetId: string;
  quantity: number;
  costBasisPerUnit: number;
  boughtAt: string;
  note?: string;
};

export type ValuedHolding = Holding & {
  label: string;
  unitPrice: number;
  marketValue: number;
  costTotal: number;
  pnl: number;
  pnlPercent: number;
};

export type PortfolioSnapshot = {
  holdings: ValuedHolding[];
  totalValue: number;
  totalCost: number;
  pnl: number;
  pnlPercent: number;
  series: CandlePoint[];
};

export type CommunityPost = {
  id: string;
  kind: CommunityPostKind;
  title?: string;
  body: string;
  author: string;
  hashtags: string[];
  source: string;
  publishedAt: string;
  likes: number;
};
