import type { Currency } from '@/src/core/constants/app';
import type { FxRates } from '@/src/domain/models';

/** Kur henüz gelmediyse TRY'ye düşer. */
export function resolveCurrency(currency: Currency, fxRates: FxRates): Currency {
  return currency === 'TRY' || fxRates[currency] ? currency : 'TRY';
}

export function fromTry(value: number, currency: Currency, fxRates: FxRates): number {
  const rate = currency === 'TRY' ? 1 : fxRates[currency];
  return rate ? value / rate : value;
}
