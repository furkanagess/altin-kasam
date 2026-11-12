/** Hasfiyat (Harem) kalem adları ve alarm değerleri; uygulama ile sunucu uçları ortak kullanır. */

/**
 * Harem kalem adları; ilk eşleşen kullanılır. Gram altın için `KÜLÇE ALTIN` önce gelir:
 * türetilmiş `GRAM ALTIN` aynı fiyattır ama günlük istatistik taşımaz.
 */
export const GRAM_GOLD_TITLES = ['KÜLÇE ALTIN', 'GRAM ALTIN'];

/**
 * `GOLD_ASSETS` id → Harem kalemi. `units`: fiyat birim başınaysa çarpan (10 gr bilezik = 10 × 22 ayar gram).
 * Harem'de 18 ayar ve Reşat yok: listede gösterilmezler, kasada gram fiyatından yaklaşık değerlenirler.
 */
export const GOLD_RATES: Record<string, { titles: readonly string[]; units: number }> = {
  'gram-24': { titles: GRAM_GOLD_TITLES, units: 1 },
  'gram-22': { titles: ['22 AYAR'], units: 1 },
  'bilezik-10': { titles: ['22 AYAR'], units: 10 },
  'bilezik-20': { titles: ['22 AYAR'], units: 20 },
  // Harem'de yok; kalem adı eklenince listede görünür.
  'gram-18': { titles: [], units: 1 },
  'gram-14': { titles: ['14 AYAR'], units: 1 },
  'ceyrek-22': { titles: ['YENİ ÇEYREK'], units: 1 },
  'yarim-22': { titles: ['YENİ YARIM'], units: 1 },
  'tam-22': { titles: ['YENİ TAM'], units: 1 },
  'resat-22': { titles: [], units: 1 },
  'cumhuriyet-22': { titles: ['YENİ ATA'], units: 1 },
  'gremse-22': { titles: ['YENİ GREMSE'], units: 1 },
  'ata5-22': { titles: ['YENİ ATA5'], units: 1 },
  'ceyrek-eski': { titles: ['ESKİ ÇEYREK'], units: 1 },
  'yarim-eski': { titles: ['ESKİ YARIM'], units: 1 },
  'tam-eski': { titles: ['ESKİ TAM'], units: 1 },
  'cumhuriyet-eski': { titles: ['ESKİ ATA'], units: 1 },
  'gremse-eski': { titles: ['ESKİ GREMSE'], units: 1 },
  'ata5-eski': { titles: ['ESKİ ATA5'], units: 1 },
};

/** Çeşidin Harem kalemi ve çarpanı; Harem'de yoksa (18 ayar, reşat) `undefined`. */
export function hasfiyatGoldRateItem(assetId: string): { title: string; units: number } | undefined {
  const entry = GOLD_RATES[assetId];
  const title = entry?.titles[0];
  return entry && title ? { title, units: entry.units } : undefined;
}

/** "YENİ ÇEYREK", "Yeni Çeyrek" ve "YENI_CEYREK" aynı kalem sayılır. */
export function normalizeTitle(title: string): string {
  return title
    .toLocaleUpperCase('tr-TR')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
    .replace(/[^A-Z0-9/]/g, '');
}


type PricedItem = { title: string; bid: number; ask: number };

const SILVER_TITLES = ['GÜMÜŞ TL'];
const OUNCE_ALARM_METALS: Record<string, string> = { 'platin-gram': 'PLATİN ONS', 'paladyum-gram': 'PALADYUM ONS' };
const RATIO_ALARM_TITLES = ['ALTIN/GÜMÜŞ'];
const TROY_OUNCE_GRAMS = 31.1034768;

/**
 * Sunucudan da izlenebilen alarm değerleri (`alarmAssets` kimlikleri → TRY alış fiyatı; rasyoda
 * birimsiz). Kasa toplamı yalnızca cihazda bilindiği için burada yoktur.
 */
export function alarmValuesFromItems(items: readonly PricedItem[]): Record<string, number> {
  const byTitle = new Map(items.map((item) => [normalizeTitle(item.title), item]));
  const find = (titles: readonly string[]) => titles.map((t) => byTitle.get(normalizeTitle(t))).find(Boolean);
  const values: Record<string, number> = {};
  for (const [assetId, { titles, units }] of Object.entries(GOLD_RATES)) {
    const item = find(titles);
    if (item) values[assetId] = item.bid * units;
  }
  const silver = find(SILVER_TITLES);
  if (silver) values['gumus-gram'] = silver.bid;
  const usdTry = find(['USD/TL']);
  if (usdTry) {
    const rate = (usdTry.bid + usdTry.ask) / 2;
    for (const [assetId, title] of Object.entries(OUNCE_ALARM_METALS)) {
      const item = find([title]);
      if (item) values[assetId] = (item.bid * rate) / TROY_OUNCE_GRAMS;
    }
  }
  const ratio = find(RATIO_ALARM_TITLES);
  const gold = values['gram-24'];
  if (ratio) values['altin-gumus-rasyosu'] = (ratio.bid + ratio.ask) / 2;
  else if (gold && silver) values['altin-gumus-rasyosu'] = gold / silver.bid;
  return values;
}
