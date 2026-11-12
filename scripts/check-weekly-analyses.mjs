#!/usr/bin/env node
/**
 * Haftalık analiz dosyasını Firebase'e yüklemeden önce denetler. Uygulama hatalı kaydı sessizce
 * atlar (`RemoteWeeklyAnalysisDatasource`); burada aynı kurallar hatayla bildirilir.
 *
 * Kullanım: npm run weekly:check [-- dosya.json]
 */
import fs from 'node:fs';

const file = process.argv[2] ?? 'firebase/public/weekly-analyses.json';
const DIRECTIONS = ['up', 'down', 'neutral'];
const REQUIRED = ['id', 'weekStart', 'title', 'summary', 'author', 'publishedAt'];

const errors = [];
const warnings = [];
const isText = (v) => typeof v === 'string' && v.trim().length > 0;

let data;
try {
  data = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ ${file} okunamadı ya da geçerli JSON değil:\n  ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(data)) {
  console.error('✗ Dosya bir liste olmalı: [ { ...hafta... }, { ... } ]');
  process.exit(1);
}

const ids = new Set();
data.forEach((a, i) => {
  const where = `${i + 1}. kayıt${a && isText(a.id) ? ` (${a.id})` : ''}`;
  if (!a || typeof a !== 'object') return errors.push(`${where}: nesne değil`);
  for (const key of REQUIRED) if (!isText(a[key])) errors.push(`${where}: "${key}" boş ya da eksik`);
  if (isText(a.weekStart)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.weekStart)) errors.push(`${where}: "weekStart" YYYY-AA-GG olmalı`);
    else if (new Date(`${a.weekStart}T00:00:00Z`).getUTCDay() !== 1) warnings.push(`${where}: "weekStart" pazartesi değil`);
  }
  if (isText(a.publishedAt) && Number.isNaN(Date.parse(a.publishedAt))) {
    errors.push(`${where}: "publishedAt" tarih değil (ör. 2026-11-16T07:00:00.000Z)`);
  }
  if (isText(a.id)) {
    if (ids.has(a.id)) errors.push(`${where}: "id" başka bir kayıtta da var`);
    ids.add(a.id);
  }
  (Array.isArray(a.outlook) ? a.outlook : []).forEach((o, j) => {
    if (o?.metal !== 'gold' && o?.metal !== 'silver') errors.push(`${where}: outlook[${j}].metal "gold" ya da "silver" olmalı`);
    if (!DIRECTIONS.includes(o?.direction)) errors.push(`${where}: outlook[${j}].direction ${DIRECTIONS.join(' / ')} olmalı`);
  });
  (Array.isArray(a.levels) ? a.levels : []).forEach((l, j) => {
    if (!isText(l?.label)) errors.push(`${where}: levels[${j}] için "label" gerekli (ör. "Gram altın")`);
    if (!isText(l?.support) && !isText(l?.resistance) && !isText(l?.value)) {
      errors.push(`${where}: levels[${j}] için "support" / "resistance" (ya da tek değer için "value") gerekli`);
    }
  });
  (Array.isArray(a.sections) ? a.sections : []).forEach((s, j) => {
    if (!isText(s?.heading) || !isText(s?.body)) errors.push(`${where}: sections[${j}] için "heading" ve "body" gerekli`);
  });
  if (!Array.isArray(a.sections) || !a.sections.length) warnings.push(`${where}: "sections" boş; detay ekranında yalnızca özet görünür`);
});

for (const w of warnings) console.warn(`! ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} hata. Düzeltmeden yüklersen bu kayıtlar uygulamada görünmez.`);
  process.exit(1);
}
const latest = [...data].sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
console.log(`✓ ${data.length} analiz geçerli${latest ? `; en güncel: ${latest.weekStart} · ${latest.title}` : ''}`);
