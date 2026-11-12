import type { PortfolioSnapshot } from '@/src/domain/models';

const SEPARATOR = ';';
const HEADER = [
  'Varlık',
  'Miktar',
  'Alış tarihi',
  'Birim maliyet',
  'Toplam maliyet',
  'Güncel birim fiyat',
  'Güncel değer',
  'Kâr/Zarar',
  'Kâr/Zarar (%)',
  'Para birimi',
  'Not',
];

/** Türkçe Excel ondalık için virgül bekler; binlik ayraç konmaz ki sayı olarak okunsun. */
function num(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/**
 * Hücreyi kaçırır. Kullanıcı notu `=`, `+`, `-`, `@` ile başlıyorsa Excel formül sayar
 * (CSV enjeksiyonu); başına kesme işareti konur.
 */
function cell(value: string): string {
  let text = value.replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return /[";]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Kasayı her alım bir satır olacak biçimde CSV'ye çevirir; sona toplam satırı eklenir. */
export function buildPortfolioCsv(snapshot: PortfolioSnapshot): string {
  const rows = snapshot.holdings.map((h) =>
    [
      cell(h.label),
      num(h.quantity),
      cell(h.boughtAt.slice(0, 10)),
      num(h.costBasisPerUnit),
      num(h.costTotal),
      num(h.unitPrice),
      num(h.marketValue),
      num(h.pnl),
      num(h.pnlPercent),
      snapshot.currency,
      cell(h.note ?? ''),
    ].join(SEPARATOR),
  );
  const total = [
    'TOPLAM',
    '',
    '',
    '',
    num(snapshot.totalCost),
    '',
    num(snapshot.totalValue),
    num(snapshot.pnl),
    num(snapshot.pnlPercent),
    snapshot.currency,
    '',
  ].join(SEPARATOR);
  // BOM: Excel UTF-8 Türkçe karakterleri doğru açsın.
  return `﻿${[HEADER.join(SEPARATOR), ...rows, total].join('\r\n')}\r\n`;
}
