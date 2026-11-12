export const APP_NAME = 'Altın Kasam';
/**
 * Fiyat yenileme aralığı (piyasa açıkken). Sunucu yanıtı CDN'de aynı süre tutulur
 * (`PRICES_TTL_OPEN_S`), daha sık sormak yeni veri getirmez.
 */
export const POLL_INTERVAL_MS = 20_000;
/** Piyasa kapalıyken (hafta sonu) fiyat değişmediği için seyrek yoklanır. */
export const POLL_INTERVAL_CLOSED_MS = 60_000;
/** Grafik serileri bu aralıkla yeniden çekilir; son nokta arada canlı fiyatla güncellenir. */
export const CHART_REFRESH_MS = 10 * 60_000;
export const HISTORY_POINTS = 48;

export const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_LABELS: Record<Currency, string> = {
  TRY: '₺ TL',
  USD: '$ USD',
  EUR: '€ EUR',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TRY: '₺',
  USD: '$',
  EUR: '€',
};

export const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export const TIMEFRAME_SPAN_MS: Record<Timeframe, number> = {
  '1D': DAY_MS,
  '1W': 7 * DAY_MS,
  '1M': 30 * DAY_MS,
  '3M': 90 * DAY_MS,
  '1Y': 365 * DAY_MS,
};

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1D': '1G',
  '1W': '1H',
  '1M': '1A',
  '3M': '3A',
  '1Y': '1Y',
};

export const TIMEFRAME_DESCRIPTIONS: Record<Timeframe, string> = {
  '1D': 'Son 24 saat',
  '1W': 'Son 1 hafta',
  '1M': 'Son 1 ay',
  '3M': 'Son 3 ay',
  '1Y': 'Son 1 yıl',
};

/** Mum aralığı günden kısaysa grafikte saat de gösterilir. */
export const TIMEFRAME_SHOWS_TIME: Record<Timeframe, boolean> = {
  '1D': true,
  '1W': true,
  '1M': true,
  '3M': false,
  '1Y': false,
};
