import type { Currency } from '@/src/core/constants/app';

const moneyFormatters = new Map<Currency, Intl.NumberFormat>();

function moneyFormatter(currency: Currency): Intl.NumberFormat {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter;
}

const tryFormatter = moneyFormatter('TRY');

const numberFormatter = new Intl.NumberFormat('tr-TR', {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('tr-TR', {
  signDisplay: 'exceptZero',
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatTRY(value: number): string {
  return tryFormatter.format(value);
}

export function formatMoney(value: number, currency: Currency): string {
  return moneyFormatter(currency).format(value);
}

export function formatSignedMoney(value: number, currency: Currency): string {
  return `${value > 0 ? '+' : ''}${moneyFormatter(currency).format(value)}`;
}

const monthYearFormatter = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' });

export function formatMonthYear(timestamp: number): string {
  return monthYearFormatter.format(timestamp);
}

const gramFormatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });

export function formatGrams(value: number): string {
  return `${gramFormatter.format(value)} g`;
}

/**
 * Sayı girişleri için ortak biçim (tr-TR): binlik ayraç ".", ondalık ayraç ",".
 * Yazarken otomatik biçimlenir: "1234567,5" -> "1.234.567,5".
 */

/** Yazılan metni ayrıştırır; "1.234,56" -> 1234.56. Geçersiz ya da boşsa NaN. */
export function parseDecimalTr(text: string): number {
  const cleaned = text.trim().replace(/\./g, '').replace(',', '.');
  return cleaned && /^\d*\.?\d*$/.test(cleaned) && /\d/.test(cleaned) ? Number(cleaned) : NaN;
}

/**
 * Giriş alanı için `onChangeText` biçimlendiricisi. `prev` önceki metindir: yeni yazılan "."
 * (ondalık klavyeler) ondalık ayraç sayılır, biçimin kendi binlik noktaları ise korunur.
 */
export function formatDecimalInput(text: string, prev = '', maxDecimals = 2): string {
  let raw = text;
  if (!raw.includes(',') && raw.length > prev.length && raw.endsWith('.')) {
    raw = `${raw.slice(0, -1)},`;
  }
  raw = raw.replace(/[^\d,]/g, '');
  const comma = raw.indexOf(',');
  const intPart = (comma === -1 ? raw : raw.slice(0, comma)).replace(/^0+(?=\d)/, '');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (comma === -1) return grouped;
  const decimals = raw.slice(comma + 1).replace(/,/g, '').slice(0, maxDecimals);
  return `${grouped || '0'},${decimals}`;
}

/** Sayıyı giriş alanı metnine çevirir: 1234.5 -> "1.234,5" (`minDecimals` ile "1.234,50"). */
export function numberToInput(value: number, maxDecimals = 2, minDecimals = 0): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: minDecimals, maximumFractionDigits: maxDecimals });
}

/** Gram miktarı: "1,5" ya da "1.234,5"; geçersizse NaN. */
export const parseGramsTr = parseDecimalTr;

export function formatChartDate(timestamp: number, withTime: boolean): string {
  return (withTime ? dateTimeFormatter : dateFormatter).format(timestamp);
}

const axisFormatters = {
  time: new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  day: new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }),
  month: new Intl.DateTimeFormat('tr-TR', { month: 'short', year: '2-digit' }),
};

/** Grafik ekseni için kısa etiket: "14:00", "4 Kas", "Kas 26". */
export function formatAxisTick(timestamp: number, granularity: keyof typeof axisFormatters): string {
  return axisFormatters[granularity].format(timestamp);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatPercent(value: number): string {
  return `${percentFormatter.format(value)}%`;
}

const dayMonthFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const dayMonthYearFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** Pazartesi başlangıçlı hafta: "9–15 Kasım 2026", ay değişiyorsa "27 Ekim – 2 Kasım 2026". */
export function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${dayMonthYearFormatter.format(end)}`;
  }
  return `${dayMonthFormatter.format(start)} – ${dayMonthYearFormatter.format(end)}`;
}

/** Saniye hassasiyetinde yaş: "az önce", "12 sn önce", "3 dk önce". */
export function formatAgeTr(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return 'az önce';
  if (seconds < 60) return `${seconds} sn önce`;
  return formatRelativeTr(new Date(timestamp).toISOString());
}

export function formatRelativeTr(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

const clockFormatter = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

/** Fiyatın geliş saati: "16:45:22". */
export function formatClockTime(timestamp: number): string {
  return clockFormatter.format(timestamp);
}
