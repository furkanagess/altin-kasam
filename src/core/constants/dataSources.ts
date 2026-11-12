/** FRED API kullanım koşullarının uygulamada görünür olmasını istediği metin; çevrilmeden gösterilir. */
export const FRED_NOTICE =
  'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.';

export type DataSource = { name: string; usage: string };

/**
 * Ayarlar > Veri kaynakları listesi. Uygulamada kaynak bilgisi yalnızca burada gösterilir;
 * yeni bir dış kaynak eklenince buraya da yazılmalıdır. Yayıncı adları `PUBLISHER_FEEDS`'ten gelir.
 */
export const DATA_SOURCE_GROUPS: { title: string; sources: DataSource[] }[] = [
  {
    title: 'Fiyatlar ve grafikler',
    sources: [
      { name: 'Hasfiyat API (Harem)', usage: 'Altın, gümüş, metal ve döviz fiyatları, fiyat geçmişi' },
      { name: 'Yahoo Finance', usage: 'Hasfiyat günlük geçmişinden önceki dönemin yaklaşık grafik verisi' },
    ],
  },
  {
    title: 'Ekonomik takvim ve raporlar',
    sources: [
      { name: 'Federal Reserve', usage: 'Faiz kararı takvimi ve karar metinleri' },
      { name: 'TCMB', usage: 'Faiz kararları, EVDS verileri' },
      { name: 'TÜİK', usage: 'Enflasyon (TÜFE) verisi ve yayın takvimi' },
      { name: 'ABD Çalışma İstatistikleri Bürosu (BLS)', usage: 'ABD enflasyon ve istihdam açıklamaları' },
      { name: 'FRED® (St. Louis Fed)', usage: 'Fed faiz bandı, ABD enflasyonu, tarım dışı istihdam ve açıklama günleri' },
    ],
  },
  {
    title: 'Topluluk',
    sources: [{ name: 'Bluesky', usage: 'Altın ve gümüş gönderileri' }],
  },
];
