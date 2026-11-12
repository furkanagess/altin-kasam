export const TROY_OUNCE_GRAMS = 31.1034768;

export function usdPerOunceToTryPerGram(usdPerOunce: number, usdTry: number): number {
  return (usdPerOunce * usdTry) / TROY_OUNCE_GRAMS;
}
