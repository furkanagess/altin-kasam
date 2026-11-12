const istanbul = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Istanbul',
  weekday: 'short',
  hour: 'numeric',
  hourCycle: 'h23',
});

/**
 * Cumartesi ve pazar 22:00'a (İstanbul) kadar piyasa kapalı sayılır: fiyatlar değişmez, bu yüzden
 * yenileme ve önbellek süreleri uzatılır. Yanlış sayılırsa en kötü durumda birkaç dakika eski fiyat
 * gösterilir; veri kaybı olmaz. Firebase fonksiyonundaki `marketClosed` ile aynı kural.
 */
export function isMarketClosed(now: number = Date.now()): boolean {
  const parts = istanbul.formatToParts(new Date(now));
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  const hour = Number(parts.find((p) => p.type === 'hour')?.value);
  return weekday === 'Sat' || (weekday === 'Sun' && hour < 22);
}
