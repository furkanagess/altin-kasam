import { getGoldAsset } from '@/src/core/constants/goldAssets';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import type { Holding, MetalQuote, PortfolioSnapshot, ValuedHolding } from '@/src/domain/models';
import { MetalSymbol } from '@/src/domain/enums';
import { createId } from '@/src/utils/id';

const STORAGE_KEY = 'altin_kasam_holdings_v1';

export type AddHoldingInput = {
  assetId: string;
  quantity: number;
  costBasisPerUnit: number;
  boughtAt?: string;
  note?: string;
};

function pureGoldGrams(assetId: string, quantity: number): number {
  const asset = getGoldAsset(assetId);
  if (!asset) return 0;
  return asset.gramWeight * asset.purity * quantity;
}

export class PortfolioRepository {
  async listHoldings(): Promise<Holding[]> {
    return (await storageGet<Holding[]>(STORAGE_KEY)) ?? [];
  }

  async saveHoldings(holdings: Holding[]): Promise<void> {
    await storageSet(STORAGE_KEY, holdings);
  }

  async addHolding(input: AddHoldingInput): Promise<Holding> {
    const holdings = await this.listHoldings();
    const holding: Holding = {
      id: createId('h'),
      assetId: input.assetId,
      quantity: input.quantity,
      costBasisPerUnit: input.costBasisPerUnit,
      boughtAt: input.boughtAt ?? new Date().toISOString(),
      note: input.note,
    };
    holdings.unshift(holding);
    await this.saveHoldings(holdings);
    return holding;
  }

  async removeHolding(id: string): Promise<void> {
    const holdings = await this.listHoldings();
    await this.saveHoldings(holdings.filter((h) => h.id !== id));
  }

  valuePortfolio(holdings: Holding[], quotes: MetalQuote[]): PortfolioSnapshot {
    const xau = quotes.find((q) => q.symbol === MetalSymbol.XAU);
    const gram24 = xau?.bid ?? 0;

    const valued: ValuedHolding[] = holdings.map((h) => {
      const asset = getGoldAsset(h.assetId);
      const pureGrams = pureGoldGrams(h.assetId, h.quantity);
      const unitPrice = asset ? gram24 * asset.gramWeight * asset.purity : 0;
      const marketValue = unitPrice * h.quantity;
      const costTotal = h.costBasisPerUnit * h.quantity;
      const pnl = marketValue - costTotal;
      const pnlPercent = costTotal === 0 ? 0 : (pnl / costTotal) * 100;
      return {
        ...h,
        label: asset?.label ?? h.assetId,
        unitPrice,
        marketValue,
        costTotal,
        pnl,
        pnlPercent,
      };
    });

    const totalValue = valued.reduce((s, v) => s + v.marketValue, 0);
    const totalCost = valued.reduce((s, v) => s + v.costTotal, 0);
    const pnl = totalValue - totalCost;
    const pnlPercent = totalCost === 0 ? 0 : (pnl / totalCost) * 100;

    const now = Date.now();
    const series = Array.from({ length: 24 }, (_, i) => {
      const wobble = 1 + Math.sin(i / 3) * 0.01 + (i / 24) * 0.02;
      return {
        t: now - (23 - i) * 60 * 60_000,
        v: Number((totalValue * wobble || gram24).toFixed(2)),
      };
    });
    if (series.length) {
      series[series.length - 1] = { t: now, v: Number(totalValue.toFixed(2)) };
    }

    return {
      holdings: valued,
      totalValue,
      totalCost,
      pnl,
      pnlPercent,
      series,
    };
  }
}

export const portfolioRepository = new PortfolioRepository();
