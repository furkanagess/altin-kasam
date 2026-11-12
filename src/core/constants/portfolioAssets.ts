import type { Currency } from '@/src/core/constants/app';
import {
  GOLD_ASSET_GROUPS,
  getGoldAsset,
  goldAssetGroup,
  type GoldAssetGroup,
} from '@/src/core/constants/goldAssets';
import { GoldForm, MetalSymbol } from '@/src/domain/enums';
import { formatNumber } from '@/src/utils/format';

/** Altın dışındaki kasa varlıkları: gram bazlı metaller ve nakit. */
export type OtherAssetDefinition =
  | { id: string; kind: 'metal'; label: string; shortName: string; metal: MetalSymbol }
  | { id: string; kind: 'cash'; label: string; shortName: string; currency: Currency; symbol: string };

export const METAL_ASSETS: OtherAssetDefinition[] = [
  { id: 'gumus-gram', kind: 'metal', label: 'Gram Gümüş', shortName: 'Gümüş', metal: MetalSymbol.XAG },
  { id: 'platin-gram', kind: 'metal', label: 'Gram Platin', shortName: 'Platin', metal: MetalSymbol.XPT },
  { id: 'paladyum-gram', kind: 'metal', label: 'Gram Paladyum', shortName: 'Paladyum', metal: MetalSymbol.XPD },
];

export const CASH_ASSETS: OtherAssetDefinition[] = [
  { id: 'nakit-try', kind: 'cash', label: 'Türk lirası', shortName: 'TL', currency: 'TRY', symbol: '₺' },
  { id: 'nakit-usd', kind: 'cash', label: 'Amerikan doları', shortName: 'Dolar', currency: 'USD', symbol: '$' },
  { id: 'nakit-eur', kind: 'cash', label: 'Euro', shortName: 'Euro', currency: 'EUR', symbol: '€' },
];

const OTHER_ASSETS = [...METAL_ASSETS, ...CASH_ASSETS];

export function getOtherAsset(id: string): OtherAssetDefinition | undefined {
  return OTHER_ASSETS.find((a) => a.id === id);
}

export type PortfolioGroupId = GoldAssetGroup | 'metal' | 'cash';

/** Kasa dağılımı ve ekleme ekranı grupları; altın grupları önce. */
export const PORTFOLIO_GROUPS: { id: PortfolioGroupId; label: string }[] = [
  ...GOLD_ASSET_GROUPS,
  { id: 'metal', label: 'Gümüş ve diğer metaller' },
  { id: 'cash', label: 'Nakit' },
];

export function portfolioGroupOf(assetId: string): PortfolioGroupId | null {
  const gold = getGoldAsset(assetId);
  if (gold) return goldAssetGroup(gold);
  const other = getOtherAsset(assetId);
  return other ? other.kind : null;
}

/** Değeri altın fiyatıyla hareket eden varlık mı (toplam varlık grafiğinde gram altınla ölçeklenir). */
export function isGoldHolding(assetId: string): boolean {
  return !!getGoldAsset(assetId);
}

export function portfolioAssetLabel(assetId: string): string {
  return getGoldAsset(assetId)?.label ?? getOtherAsset(assetId)?.label ?? assetId;
}

/** Birimiyle miktar: "4 adet", "12,5 gram", "500 $". */
export function formatAssetQuantity(assetId: string, quantity: number): string {
  const other = getOtherAsset(assetId);
  const unit = other?.kind === 'cash' ? other.symbol : portfolioQuantityUnit(assetId);
  return `${formatNumber(quantity)} ${unit}`;
}

/** Miktarın birimi: "gram", "adet" ya da para birimi kodu ("USD"). */
export function portfolioQuantityUnit(assetId: string): string {
  const gold = getGoldAsset(assetId);
  if (gold) return gold.form === GoldForm.Gram ? 'gram' : 'adet';
  const other = getOtherAsset(assetId);
  if (!other) return 'adet';
  return other.kind === 'metal' ? 'gram' : other.currency;
}
