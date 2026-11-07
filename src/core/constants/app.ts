export const APP_NAME = 'Altın Kasam';
export const APP_TAGLINE = 'Canlı emtia · sanal kasa · topluluk';

export const POLL_INTERVAL_MS = 5_000;
export const HISTORY_POINTS = 48;

export const CURRENCY = 'TRY' as const;

export const TIMEFRAMES = ['1D', '1W', '1M', '1Y'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
