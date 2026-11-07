import { GoldForm, GoldKarat, GOLD_PURITY } from '@/src/domain/enums';

export type GoldAssetDefinition = {
  id: string;
  label: string;
  form: GoldForm;
  karat: GoldKarat;
  gramWeight: number;
  purity: number;
};

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
  {
    id: 'ceyrek-22',
    label: 'Çeyrek Altın',
    form: GoldForm.Quarter,
    karat: GoldKarat.K22,
    gramWeight: 1.75,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'yarim-22',
    label: 'Yarım Altın',
    form: GoldForm.Half,
    karat: GoldKarat.K22,
    gramWeight: 3.5,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'tam-22',
    label: 'Tam Altın',
    form: GoldForm.Full,
    karat: GoldKarat.K22,
    gramWeight: 7,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'resat-22',
    label: 'Reşat Altın',
    form: GoldForm.Resat,
    karat: GoldKarat.K22,
    gramWeight: 7.216,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
  {
    id: 'cumhuriyet-22',
    label: 'Cumhuriyet Altını',
    form: GoldForm.Cumhuriyet,
    karat: GoldKarat.K22,
    gramWeight: 7.216,
    purity: GOLD_PURITY[GoldKarat.K22],
  },
];

export function getGoldAsset(id: string): GoldAssetDefinition | undefined {
  return GOLD_ASSETS.find((a) => a.id === id);
}
