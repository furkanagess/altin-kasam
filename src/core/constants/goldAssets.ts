import { GoldForm, GoldKarat, GOLD_PURITY } from '@/src/domain/enums';

export type GoldAssetDefinition = {
  id: string;
  label: string;
  form: GoldForm;
  karat: GoldKarat;
  gramWeight: number;
  purity: number;
  /**
   * Ziynette basım: kuyumcu eski basımı daha ucuza alır. Yoksa ayrımı yoktur (gram, bilezik, reşat).
   * Kimliksiz sürüm (`ceyrek-22`) yeni basımdır; kayıtlı kasalar bu kimlikleri kullanır.
   */
  edition?: GoldEdition;
};

export type GoldEdition = 'yeni' | 'eski';

export const GOLD_EDITIONS: { id: GoldEdition; label: string }[] = [
  { id: 'yeni', label: 'Yeni' },
  { id: 'eski', label: 'Eski' },
];

function ziynet(
  id: string,
  label: string,
  form: GoldForm,
  gramWeight: number,
  edition: GoldEdition,
): GoldAssetDefinition {
  return { id, label, form, karat: GoldKarat.K22, gramWeight, purity: GOLD_PURITY[GoldKarat.K22], edition };
}

/** Tek doğruluk kaynağı — ViewModel hardcode etmez. */
export const GOLD_ASSETS: GoldAssetDefinition[] = [
  {
    id: 'gram-24',
    label: 'Gram Altın (24 ayar)',
    form: GoldForm.Gram,
    karat: GoldKarat.K24,
    gramWeight: 1,
    purity: GOLD_PURITY[GoldKarat.K24],
  },
  {
    id: 'gram-22',
    label: 'Gram Altın (22 ayar)',
    form: GoldForm.Gram,
    karat: GoldKarat.K22,
    gramWeight: 1,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'bilezik-10',
    label: 'Bilezik 10 gr (22 ayar)',
    form: GoldForm.Bilezik,
    karat: GoldKarat.K22,
    gramWeight: 10,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'bilezik-20',
    label: 'Bilezik 20 gr (22 ayar)',
    form: GoldForm.Bilezik,
    karat: GoldKarat.K22,
    gramWeight: 20,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'gram-18',
    label: 'Gram Altın (18 ayar)',
    form: GoldForm.Gram,
    karat: GoldKarat.K18,
    gramWeight: 1,
    purity: GOLD_PURITY[GoldKarat.K18],
  },
  {
    id: 'gram-14',
    label: 'Gram Altın (14 ayar)',
    form: GoldForm.Gram,
    karat: GoldKarat.K14,
    gramWeight: 1,
    purity: GOLD_PURITY[GoldKarat.K14],
  },
  ziynet('ceyrek-22', 'Çeyrek Altın', GoldForm.Quarter, 1.75, 'yeni'),
  ziynet('yarim-22', 'Yarım Altın', GoldForm.Half, 3.5, 'yeni'),
  ziynet('tam-22', 'Tam Altın', GoldForm.Full, 7, 'yeni'),
  {
    id: 'resat-22',
    label: 'Reşat Altın',
    form: GoldForm.Resat,
    karat: GoldKarat.K22,
    gramWeight: 7.216,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  ziynet('cumhuriyet-22', 'Cumhuriyet Altını', GoldForm.Cumhuriyet, 7.216, 'yeni'),
  ziynet('gremse-22', 'Gremse Altın', GoldForm.Gremse, 17.54, 'yeni'),
  ziynet('ata5-22', "Ata 5'li Altın", GoldForm.Ata5, 36.08, 'yeni'),
  ziynet('ceyrek-eski', 'Eski Çeyrek Altın', GoldForm.Quarter, 1.75, 'eski'),
  ziynet('yarim-eski', 'Eski Yarım Altın', GoldForm.Half, 3.5, 'eski'),
  ziynet('tam-eski', 'Eski Tam Altın', GoldForm.Full, 7, 'eski'),
  ziynet('cumhuriyet-eski', 'Eski Cumhuriyet Altını', GoldForm.Cumhuriyet, 7.216, 'eski'),
  ziynet('gremse-eski', 'Eski Gremse Altın', GoldForm.Gremse, 17.54, 'eski'),
  ziynet('ata5-eski', "Eski Ata 5'li Altın", GoldForm.Ata5, 36.08, 'eski'),
];

export function getGoldAsset(id: string): GoldAssetDefinition | undefined {
  return GOLD_ASSETS.find((a) => a.id === id);
}

export type GoldAssetGroup = 'gram' | 'ziynet' | 'bilezik';

export const GOLD_ASSET_GROUPS: { id: GoldAssetGroup; label: string }[] = [
  { id: 'gram', label: 'Gram altın' },
  { id: 'ziynet', label: 'Ziynet altını' },
  { id: 'bilezik', label: 'Bilezik' },
];

export function goldAssetGroup(asset: GoldAssetDefinition): GoldAssetGroup {
  if (asset.form === GoldForm.Gram) return 'gram';
  if (asset.form === GoldForm.Bilezik) return 'bilezik';
  return 'ziynet';
}

const FORM_SHORT_NAMES: Partial<Record<GoldForm, string>> = {
  [GoldForm.Quarter]: 'Çeyrek',
  [GoldForm.Half]: 'Yarım',
  [GoldForm.Full]: 'Tam',
  [GoldForm.Resat]: 'Reşat',
  [GoldForm.Cumhuriyet]: 'Cumhuriyet',
  [GoldForm.Gremse]: 'Gremse',
  [GoldForm.Ata5]: "Ata 5'li",
};

/** Seçim kartları için kısa ad: "Gram", "Çeyrek", "Eski çeyrek", "10 gr bilezik". */
export function goldAssetShortName(asset: GoldAssetDefinition): string {
  if (asset.form === GoldForm.Gram) return 'Gram';
  if (asset.form === GoldForm.Bilezik) return `${asset.gramWeight} gr bilezik`;
  const base = FORM_SHORT_NAMES[asset.form] ?? asset.label;
  return asset.edition === 'eski' ? `Eski ${base.toLocaleLowerCase('tr')}` : base;
}

const weightFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

/**
 * Liste satırı için tek satırlık ad ve altındaki bilgi: "Gram Altın" / "24 ayar",
 * "Bilezik 10 gr" / "22 ayar", "Eski Çeyrek Altın" / "Eski basım · 1,75 g".
 */
export function goldAssetRowText(asset: GoldAssetDefinition): { title: string; meta: string } {
  const title = asset.label.replace(/\s*\([^)]*\)\s*$/, '');
  if (asset.form === GoldForm.Gram || asset.form === GoldForm.Bilezik) {
    return { title, meta: `${asset.karat} ayar` };
  }
  const edition = asset.edition === 'eski' ? 'Eski basım' : `${asset.karat} ayar`;
  return { title, meta: `${edition} · ${weightFormatter.format(asset.gramWeight)} g` };
}

/** Aynı ürünün diğer basımı (çeyrek ↔ eski çeyrek); basım ayrımı yoksa ürünün kendisi. */
export function goldAssetInEdition(asset: GoldAssetDefinition, edition: GoldEdition): GoldAssetDefinition {
  if (!asset.edition || asset.edition === edition) return asset;
  return (
    GOLD_ASSETS.find(
      (a) => a.form === asset.form && a.gramWeight === asset.gramWeight && a.edition === edition,
    ) ?? asset
  );
}

/**
 * Adet başına 24 ayar gram altın karşılığı: farklı ayar ve formları aynı
 * ölçüyle toplamak için (1 gram 24 ayar = 1, çeyrek ≈ 1,61, 10 gr 22 ayar bilezik ≈ 9,21).
 */
export function gramGoldEquivalent(assetId: string): number {
  const asset = getGoldAsset(assetId);
  if (!asset) return 0;
  return (asset.gramWeight * asset.purity) / GOLD_PURITY[GoldKarat.K24];
}
