import { getGoldAsset, type GoldAssetDefinition } from '@/src/core/constants/goldAssets';
import { getOtherAsset } from '@/src/core/constants/portfolioAssets';
import { MetalSymbol } from '@/src/domain/enums';
import type { GoldRate, MetalQuote } from '@/src/domain/models';
import { formatMoney, formatNumber, formatTRY } from '@/src/utils/format';

export const PORTFOLIO_ALARM_ID = 'kasa-toplam';
export const RATIO_ALARM_ID = 'altin-gumus-rasyosu';

/**
 * Alarm kurulabilen değer: altın çeşidi (adet/gram kuru), gram metal (gümüş, platin, paladyum),
 * ons fiyatı (USD), kasanın toplam değeri ya da altın/gümüş rasyosu.
 */
export type AlarmAsset =
  | { id: string; label: string; kind: 'gold'; gold: GoldAssetDefinition }
  | { id: string; label: string; kind: 'metal'; metal: MetalSymbol }
  /** Uluslararası spot ons fiyatı; USD cinsindendir (gösterim para biriminden bağımsız). */
  | { id: string; label: string; kind: 'ounce'; metal: MetalSymbol }
  | { id: typeof PORTFOLIO_ALARM_ID; label: string; kind: 'portfolio' }
  | { id: typeof RATIO_ALARM_ID; label: string; kind: 'ratio' };

/** Piyasa grafiğindeki metalin alarm varlığı. */
export const METAL_ALARM_ASSET: Record<MetalSymbol, string> = {
  [MetalSymbol.XAU]: 'gram-24',
  [MetalSymbol.XAG]: 'gumus-gram',
  [MetalSymbol.XPT]: 'platin-gram',
  [MetalSymbol.XPD]: 'paladyum-gram',
};

/** Piyasa grafiğindeki metalin ons alarm varlığı (USD/ons). */
export const OUNCE_ALARM_ASSET: Record<MetalSymbol, string> = {
  [MetalSymbol.XAU]: 'ons-altin',
  [MetalSymbol.XAG]: 'ons-gumus',
  [MetalSymbol.XPT]: 'ons-platin',
  [MetalSymbol.XPD]: 'ons-paladyum',
};
const OUNCE_ALARM_LABELS: Record<MetalSymbol, string> = {
  [MetalSymbol.XAU]: 'Ons Altın',
  [MetalSymbol.XAG]: 'Ons Gümüş',
  [MetalSymbol.XPT]: 'Ons Platin',
  [MetalSymbol.XPD]: 'Ons Paladyum',
};

export function getAlarmAsset(id: string): AlarmAsset | undefined {
  if (id === PORTFOLIO_ALARM_ID) return { id, label: 'Kasa toplam değeri', kind: 'portfolio' };
  if (id === RATIO_ALARM_ID) return { id, label: 'Altın/Gümüş rasyosu', kind: 'ratio' };
  const ounce = (Object.entries(OUNCE_ALARM_ASSET) as [MetalSymbol, string][]).find(([, assetId]) => assetId === id);
  if (ounce) return { id, label: OUNCE_ALARM_LABELS[ounce[0]], kind: 'ounce', metal: ounce[0] };
  const gold = getGoldAsset(id);
  if (gold) return { id, label: gold.label, kind: 'gold', gold };
  const other = getOtherAsset(id);
  if (other?.kind === 'metal') return { id, label: other.label, kind: 'metal', metal: other.metal };
  return undefined;
}

/** Alarmın izlediği güncel değerler; kasa değeri TRY'dir (gösterim para biriminden bağımsız). */
export type AlarmPrices = {
  goldRates: GoldRate[];
  quotes: MetalQuote[];
  /** Ons fiyatları (USD/ons); kaynak vermezse boş. */
  ounceQuotes: MetalQuote[];
  portfolioValue?: number;
  ratio?: number;
};

/** Altın ve metallerde alış (bozdurma) fiyatı: TRY (metallerde gram); onsta USD/ons. */
export function alarmPriceOf(id: string, prices: AlarmPrices): number | undefined {
  const asset = getAlarmAsset(id);
  if (!asset) return undefined;
  if (asset.kind === 'portfolio') return prices.portfolioValue || undefined;
  if (asset.kind === 'ratio') return prices.ratio;
  if (asset.kind === 'gold') return prices.goldRates.find((r) => r.assetId === id)?.bid;
  if (asset.kind === 'ounce') return prices.ounceQuotes.find((q) => q.symbol === asset.metal)?.bid;
  return prices.quotes.find((q) => q.symbol === asset.metal)?.bid;
}

/** Rasyo birimsizdir, ons USD'dir; diğerleri TL. */
export function formatAlarmValue(asset: AlarmAsset, value: number): string {
  if (asset.kind === 'ounce') return formatMoney(value, 'USD');
  return asset.kind === 'ratio'
    ? value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : formatTRY(value);
}

/** Metinlerdeki karşılığı: "Güncel alış ₺…", "Güncel değer ₺…", "Güncel rasyo 81,20". */
export function alarmValueNoun(asset: AlarmAsset): 'alış' | 'değer' | 'rasyo' {
  return asset.kind === 'portfolio' ? 'değer' : asset.kind === 'ratio' ? 'rasyo' : 'alış';
}

/** Ek almış biçimler: "güncel alış fiyatına göre", "güncel rasyonun üstünde". */
export function alarmValueCases(asset: AlarmAsset): { dative: string; genitive: string } {
  if (asset.kind === 'portfolio') return { dative: 'değere', genitive: 'değerin' };
  if (asset.kind === 'ratio') return { dative: 'rasyoya', genitive: 'rasyonun' };
  return { dative: 'alış fiyatına', genitive: 'alış fiyatının' };
}

/** Hedef alanının başlığı. */
export function alarmTargetTitle(asset: AlarmAsset): string {
  if (asset.kind === 'portfolio') return 'Hedef kasa değeri';
  if (asset.kind === 'ratio') return 'Hedef rasyo';
  return 'Hedef fiyat';
}

/** `formatNumber` ile aynı yerel biçim; giriş alanı örneği. */
export function alarmPlaceholder(asset: AlarmAsset): string {
  if (asset.kind === 'ratio') return `Örn. ${formatNumber(80)}`;
  if (asset.kind === 'portfolio') return 'Örn. 100.000';
  if (asset.kind === 'ounce') return `Örn. ${formatNumber(4000)}`;
  return 'Örn. 11.000';
}
