import type { Currency } from "@/src/core/constants/app";
import {
    getGoldAsset,
    gramGoldEquivalent,
} from "@/src/core/constants/goldAssets";
import {
    formatAssetQuantity,
    getOtherAsset,
    PORTFOLIO_GROUPS,
    portfolioAssetLabel,
    portfolioGroupOf,
} from "@/src/core/constants/portfolioAssets";
import { storageGet, storageSet } from "@/src/core/storage/storage";
import { MetalSymbol } from "@/src/domain/enums";
import type {
    CandlePoint,
    DayRange,
    FxRates,
    GoldRate,
    Holding,
    MetalQuote,
    PortfolioBreakdown,
    PortfolioPosition,
    PortfolioSnapshot,
    ValuedHolding,
} from "@/src/domain/models";
import { fromTry, resolveCurrency } from "@/src/utils/currency";
import { createId } from "@/src/utils/id";

const STORAGE_KEY = "altin_kasam_holdings_v1";

/** Dünkü kapanış alış fiyatı; kaynak vermezse günlük değişim yüzdesinden türetilir. */
function previousBid(
  price: { bid: number; changePercent: number; day?: DayRange } | undefined,
): number | undefined {
  if (!price) return undefined;
  if (price.day?.previousClose) return price.day.previousClose;
  return price.changePercent > -100 ? price.bid / (1 + price.changePercent / 100) : undefined;
}
const quantityFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
});

/** Portföy grafiği için fiyat geçmişleri; hepsi aynı periyotta ve aynı mum zamanlarında. */
export type PortfolioHistory = {
  /** Gösterim para birimi. */
  currency: Currency;
  /** Gram altın, gösterim para biriminde; grafiğin zaman ekseni. */
  gold: CandlePoint[];
  /** Gram altın, nakit kalemlerin para birimlerinde (kur hesabı için). */
  goldBy: Partial<Record<Currency, CandlePoint[]>>;
  /** Gram metal fiyatları, gösterim para biriminde. */
  metals: Partial<Record<MetalSymbol, CandlePoint[]>>;
};

/** Zaman damgasından değer; tam eşleşme yoksa öncesindeki son değer. */
function indexed(series: CandlePoint[]): (t: number) => number {
  const byTime = new Map(series.map((p) => [p.t, p.v]));
  return (t) => {
    const exact = byTime.get(t);
    if (exact != null) return exact;
    let value = series[0]?.v ?? NaN;
    for (const p of series) {
      if (p.t > t) break;
      value = p.v;
    }
    return value;
  };
}

/** Alımları birim başına birleştirir; ortalama maliyet ağırlıklıdır (toplam maliyet / toplam miktar). */
function positionsOf(holdings: ValuedHolding[]): PortfolioPosition[] {
  const byAsset = new Map<string, ValuedHolding[]>();
  for (const h of holdings) byAsset.set(h.assetId, [...(byAsset.get(h.assetId) ?? []), h]);
  return [...byAsset.entries()]
    .map(([assetId, items]) => {
      const quantity = items.reduce((s, h) => s + h.quantity, 0);
      const costTotal = items.reduce((s, h) => s + h.costTotal, 0);
      const marketValue = items.reduce((s, h) => s + h.marketValue, 0);
      const pnl = marketValue - costTotal;
      const sorted = [...items].sort((a, b) => b.boughtAt.localeCompare(a.boughtAt));
      return {
        assetId,
        label: items[0].label,
        quantity,
        averageCost: quantity ? costTotal / quantity : 0,
        unitPrice: items[0].unitPrice,
        marketValue,
        costTotal,
        pnl,
        pnlPercent: costTotal ? (pnl / costTotal) * 100 : 0,
        firstBoughtAt: sorted[sorted.length - 1].boughtAt,
        holdings: sorted,
      };
    })
    .sort((a, b) => b.marketValue - a.marketValue);
}

/** 1 birim nakdin gösterim para birimindeki değeri: altın(gösterim) / altın(nakit birimi). */
function fxSeries(goldShown: CandlePoint[], goldInCash: CandlePoint[]): CandlePoint[] {
  const inCash = indexed(goldInCash);
  return goldShown.map((p) => ({ t: p.t, v: p.v / inCash(p.t) }));
}

export type AddHoldingInput = {
  assetId: string;
  quantity: number;
  costBasisPerUnit: number;
  boughtAt?: string;
  note?: string;
};

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
      id: createId("h"),
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

  /**
   * Değerleme TRY'de yapılır; tutarlar sonra güncel kurla `currency`'ye çevrilir
   * (maliyet de bugünkü kurla çevrildiğinden P&L yüzdesi para biriminden bağımsızdır).
   */
  valuePortfolio(
    holdings: Holding[],
    quotes: MetalQuote[],
    goldRates: GoldRate[] = [],
    currency: Currency = "TRY",
    fxRates: FxRates = {},
    /** Kurların günlük değişimi (%); bilinmeyen kurun günlük etkisi 0 sayılır. */
    fxChangePercent: Partial<Record<Currency, number>> = {},
  ): PortfolioSnapshot {
    const shownCurrency = resolveCurrency(currency, fxRates);
    const money = (value: number) => fromTry(value, shownCurrency, fxRates);

    const xau = quotes.find((q) => q.symbol === MetalSymbol.XAU);
    const gram24 = xau?.bid ?? 0;

    /** Birim alış (bozdurma) fiyatı, TRY. */
    const unitPriceOf = (assetId: string): number => {
      const gold = getGoldAsset(assetId);
      if (gold) {
        return (
          goldRates.find((r) => r.assetId === assetId)?.bid ??
          gram24 * gold.gramWeight * gold.purity
        );
      }
      const other = getOtherAsset(assetId);
      if (!other) return 0;
      if (other.kind === "metal")
        return quotes.find((q) => q.symbol === other.metal)?.bid ?? 0;
      return other.currency === "TRY" ? 1 : (fxRates[other.currency] ?? 0);
    };

    /** Dünkü kapanıştaki birim alış fiyatı, TRY; bilinmiyorsa bugünkü fiyat (değişim 0). */
    const previousUnitPriceOf = (assetId: string, unitPrice: number): number => {
      const gold = getGoldAsset(assetId);
      let previous: number | undefined;
      if (gold) {
        const rate = goldRates.find((r) => r.assetId === assetId);
        const gram = previousBid(xau);
        previous = rate ? previousBid(rate) : gram && gram * gold.gramWeight * gold.purity;
      } else {
        const other = getOtherAsset(assetId);
        if (other?.kind === "metal") previous = previousBid(quotes.find((q) => q.symbol === other.metal));
        else if (other?.kind === "cash" && other.currency !== "TRY") {
          const change = fxChangePercent[other.currency];
          previous = change != null && change > -100 ? unitPrice / (1 + change / 100) : undefined;
        }
      }
      return previous && previous > 0 ? previous : unitPrice;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayStart = today.getTime();

    const valued: ValuedHolding[] = holdings.map((h) => {
      const unitPrice = unitPriceOf(h.assetId);
      const marketValue = unitPrice * h.quantity;
      const costTotal = h.costBasisPerUnit * h.quantity;
      const pnl = marketValue - costTotal;
      const pnlPercent = costTotal === 0 ? 0 : (pnl / costTotal) * 100;
      return {
        ...h,
        label: portfolioAssetLabel(h.assetId),
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

    // Günün başındaki değer: önceden alınanlar dünkü kapanışla, bugün alınanlar alış fiyatıyla.
    const dayReference = valued.reduce((s, v) => {
      const boughtToday = new Date(v.boughtAt).getTime() >= dayStart;
      const unit = boughtToday ? v.costBasisPerUnit : previousUnitPriceOf(v.assetId, v.unitPrice);
      return s + unit * v.quantity;
    }, 0);
    const dayPnl = totalValue - dayReference;
    const dayPnlPercent = dayReference === 0 ? 0 : (dayPnl / dayReference) * 100;

    const shownHoldings = valued.map((h) => ({
      ...h,
      costBasisPerUnit: money(h.costBasisPerUnit),
      unitPrice: money(h.unitPrice),
      marketValue: money(h.marketValue),
      costTotal: money(h.costTotal),
      pnl: money(h.pnl),
    }));

    return {
      holdings: shownHoldings,
      positions: positionsOf(shownHoldings),
      totalValue: money(totalValue),
      totalCost: money(totalCost),
      pnl: money(pnl),
      pnlPercent,
      dayPnl: money(dayPnl),
      dayPnlPercent,
      currency: shownCurrency,
    };
  }

  /**
   * Kasanın dönem içindeki değeri ve o ana kadarki toplam maliyet; her kalem yalnızca alındığı
   * andan sonra sayılır (ilk alımdan önce kasa 0). Değerler gösterim para birimindedir:
   * - altın kalemler gram altın serisiyle, metaller kendi serileriyle ölçeklenir,
   * - nakit o anki kurla çevrilir; kur, gram altının iki para birimindeki fiyatlarının oranıdır.
   */
  valueSeries(
    holdings: ValuedHolding[],
    history: PortfolioHistory,
    now = Date.now(),
  ): { points: CandlePoint[]; cost: number[]; deposits: number[] } {
    const timeline = history.gold;
    if (!holdings.length || timeline.length < 2) return { points: [], cost: [], deposits: [] };
    const lastT = timeline[timeline.length - 1].t;

    // Kalem başına fiyat serisi; serisi olmayan kalem bugünkü değerinde sabit sayılır.
    const legs = holdings.map((h) => {
      const gold = getGoldAsset(h.assetId);
      const other = getOtherAsset(h.assetId);
      let series: CandlePoint[] | undefined;
      if (gold) series = history.gold;
      else if (other?.kind === "metal") series = history.metals[other.metal];
      else if (other?.kind === "cash" && other.currency !== history.currency) {
        // Nakdin gösterim para birimindeki değeri kurla değişir: altın(gösterim) / altın(nakit birimi).
        const inCash = history.goldBy[other.currency];
        series = inCash ? fxSeries(history.gold, inCash) : undefined;
      }
      const ref = series?.[series.length - 1]?.v;
      return {
        boughtAt: Date.parse(h.boughtAt) || 0,
        value: h.marketValue,
        cost: h.costTotal,
        at: series && ref ? indexed(series) : null,
        ref,
      };
    });

    // Tüm pencere çizilir; alımdan önceki noktalar 0'dır. Alım anları da nokta olarak eklenir ki
    // basamak mum ortasında değil tam alım anında görünsün.
    const firstT = timeline[0].t;
    const purchaseTimes = legs.map((l) => l.boughtAt).filter((t) => t > firstT && t < lastT);
    const times = [...new Set([...timeline.map((p) => p.t), ...purchaseTimes])].sort((a, b) => a - b);

    const points: CandlePoint[] = [];
    const cost: number[] = [];
    for (const t of times) {
      // Son nokta "şimdi"dir: henüz mumu açılmamış yeni alımlar da dahil.
      const isLast = t === lastT;
      let value = 0;
      let invested = 0;
      for (const leg of legs) {
        if (!isLast && leg.boughtAt > t && leg.boughtAt <= now) continue;
        const ratio = leg.at && leg.ref ? leg.at(t) / leg.ref : 1;
        value += leg.value * (Number.isFinite(ratio) ? ratio : 1);
        invested += leg.cost;
      }
      points.push({ t, v: value });
      cost.push(invested);
    }

    // Kasaya ekleme anları: pencere içindeki alımın noktası; son mumdan sonraki alım son noktadadır.
    const depositSet = new Set<number>();
    for (const leg of legs) {
      if (leg.boughtAt <= firstT || leg.boughtAt > now) continue;
      depositSet.add(leg.boughtAt >= lastT ? times.length - 1 : times.indexOf(leg.boughtAt));
    }
    const deposits = [...depositSet].filter((i) => i >= 0).sort((a, b) => a - b);
    return { points, cost, deposits };
  }

  /** Aynı varlığın alımları birleştirilir (iki ayrı dolar alımı tek "Dolar" satırı). */
  private itemsOf(holdings: ValuedHolding[], total: number) {
    const byAsset = new Map<string, { value: number; quantity: number }>();
    for (const h of holdings) {
      const current = byAsset.get(h.assetId) ?? { value: 0, quantity: 0 };
      byAsset.set(h.assetId, {
        value: current.value + h.marketValue,
        quantity: current.quantity + h.quantity,
      });
    }
    return [...byAsset.entries()]
      .map(([assetId, { value, quantity }]) => {
        const asset = getOtherAsset(assetId);
        // Ziynet kalemleri (çeyrek, yarım, reşat…) adet cinsindendir; etiket ayar ve basımı da taşır.
        const amount = !asset
          ? formatAssetQuantity(assetId, quantity)
          : asset.kind === "cash"
            ? `${quantityFormatter.format(quantity)} ${asset.symbol}`
            : `${quantityFormatter.format(quantity)} g`;
        return {
          id: assetId,
          label: asset?.shortName ?? portfolioAssetLabel(assetId),
          value,
          share: value / total,
          amount,
        };
      })
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Nakit, metal ve ziynet kırılımı yalnızca en az 2 farklı alt tür (dolar + euro, gümüş + platin,
   * çeyrek + yarım gibi) olduğunda verilir; tek türde kırılım bilgi katmaz. Nakit ve metalde onun
   * yerine satır özeti verilir; ziynetin ana satırı zaten toplam adedi gösterir.
   */
  private splitOf(groupId: string, holdings: ValuedHolding[], total: number) {
    if (groupId !== "cash" && groupId !== "metal" && groupId !== "ziynet") return {};
    const items = this.itemsOf(holdings, total);
    if (items.length >= 2) return { items };
    const only = items[0];
    if (!only || groupId === "ziynet") return {};
    return { summary: groupId === "metal" ? `${only.label} ${only.amount}` : only.amount };
  }

  /** Tam ekran görünümündeki döküm: türlere göre dağılım ve gram karşılığı. */
  breakdown(snapshot: PortfolioSnapshot): PortfolioBreakdown {
    const total = snapshot.totalValue || 1;
    const groups = PORTFOLIO_GROUPS.map((group) => {
      const items = snapshot.holdings.filter(
        (h) => portfolioGroupOf(h.assetId) === group.id,
      );
      const value = items.reduce((sum, h) => sum + h.marketValue, 0);
      const quantity = items.reduce((sum, h) => sum + h.quantity, 0);
      // Nakit (karışık para birimi) ve metallerde (farklı metallerin gramı) toplam miktar anlamsızdır;
      // miktar kırılım satırlarında gösterilir.
      const unit: "gram" | "adet" | null =
        group.id === "cash" || group.id === "metal"
          ? null
          : group.id === "gram"
            ? "gram"
            : "adet";
      return {
        id: group.id,
        label: group.label,
        value,
        share: value / total,
        quantity,
        unit,
        ...this.splitOf(group.id, items, total),
      };
    }).filter((g) => g.quantity > 0);
    return {
      groups,
      pureGrams: snapshot.holdings.reduce(
        (sum, h) => sum + gramGoldEquivalent(h.assetId) * h.quantity,
        0,
      ),
    };
  }
}

export const portfolioRepository = new PortfolioRepository();
