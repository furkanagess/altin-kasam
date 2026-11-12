/** `app/api/prices+api.ts` vekil ucunun yanıtı; fiyatlar TRY ve düz sayıdır. */
export type HasfiyatItem = {
  /** Kaynağın kalem adı (ör. "HAS ALTIN", "YENİ ÇEYREK", "USD/TL"). */
  title: string;
  bid: number;
  ask: number;
  /** Günlük değişim (%); kaynak vermezse null. */
  changePercent: number | null;
  /** Alış tarafının günlük istatistiği; türetilmiş kalemlerde yok. */
  day: { open: number; high: number; low: number; previousClose: number } | null;
};

/** `app/api/history+api.ts` yanıtı: alış kapanışları (TRY), zaman sıralı. */
export type HasfiyatHistoryResponse = {
  points: { t: number; v: number }[];
};

export type HasfiyatPricesResponse = {
  source: string;
  lastUpdate: string | null;
  stale: boolean;
  items: HasfiyatItem[];
};
