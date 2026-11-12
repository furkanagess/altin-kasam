/**
 * Açıklanmış olay raporu (yalnızca sunucu): resmî kaynak bağlantısı ve faiz kararlarında karar
 * metninden çıkarımlar. Fed ve TCMB metinleri sunucuda okunur; TÜİK bülteni yalnızca tarayıcıda
 * açılabildiği, BLS de sunucu isteklerini engellediği için bu ikisinde yalnızca bağlantı verilir.
 * Ton, metindeki belirli ifadelere bakan kurallarla belirlenir; bir model kullanılmaz.
 */

import type { EconomicEventReport, StatementTone } from '@/src/data/datasources/economicReportTypes';
import type { EconomicEvent } from '@/src/domain/models';
import { findEvent, request } from '@/src/server/economicCalendarService';
import { dataLicenses } from '@/src/server/dataLicenses';

const REPORT_TTL_MS = 24 * 60 * 60_000;
const MISSING_STATEMENT_TTL_MS = 15 * 60_000;
const MAX_PARAGRAPHS = 4;
const MAX_PARAGRAPH_CHARS = 700;

const TCMB_BASE = 'https://www.tcmb.gov.tr';
const TCMB_PRESS_LIST = (year: number) => `${TCMB_BASE}/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Basin/${year}/`;
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; AltinKasam/1.0)' };

const cache = new Map<string, { at: number; ttl: number; report: EconomicEventReport }>();

type Statement = NonNullable<EconomicEventReport['statement']>;
type TonePattern = { pattern: RegExp; reason: string; weight: number };

/** Pozitif ağırlık sıkı (şahin), negatif gevşek (güvercin) yön. */
const FED_TONE: TonePattern[] = [
  { pattern: /inflation remains elevated/i, reason: 'Enflasyonun “yüksek seyrettiği” vurgulandı', weight: 1 },
  { pattern: /upside risks? to inflation/i, reason: 'Enflasyonda yukarı yönlü risklere dikkat çekildi', weight: 1 },
  { pattern: /deliver price stability/i, reason: 'Fiyat istikrarı kararlılığı yinelendi', weight: 1 },
  // Karşı oy gerekçesi ("preferred to raise the target range") karar sayılmaz.
  { pattern: /decided to raise the target range/i, reason: 'Faiz bandı artırıldı', weight: 2 },
  { pattern: /decided to lower the target range/i, reason: 'Faiz bandı indirildi', weight: -2 },
  { pattern: /downside risks? to employment/i, reason: 'İstihdamda aşağı yönlü risklere dikkat çekildi', weight: -1 },
  { pattern: /inflation has (?:eased|moved down|declined)/i, reason: 'Enflasyonun gerilediği belirtildi', weight: -1 },
];

const TCMB_TONE: TonePattern[] = [
  { pattern: /sıkılaştırıl/i, reason: 'Gerekirse sıkılaştırma yapılacağı belirtildi', weight: 1 },
  { pattern: /ihtiyatlı/i, reason: '“İhtiyatlı” duruş vurgulandı', weight: 1 },
  { pattern: /yukarı yönlü risk/i, reason: 'Enflasyonda yukarı yönlü risklere dikkat çekildi', weight: 1 },
  { pattern: /sıkı para politikası duruşu/i, reason: 'Sıkı para politikası duruşunun süreceği yinelendi', weight: 1 },
  { pattern: /indirilmesine karar/i, reason: 'Politika faizi indirildi', weight: -2 },
  { pattern: /artırılmasına karar/i, reason: 'Politika faizi artırıldı', weight: 2 },
  { pattern: /(?:ana eğilimdeki gerilemeyi|dezenflasyon[^.]*güçlen)/i, reason: 'Enflasyonun ana eğiliminde düşüş olduğu belirtildi', weight: -1 },
];

function toneOf(text: string, patterns: TonePattern[], extra: number): { tone: StatementTone; reasons: string[] } {
  let score = extra;
  const reasons: string[] = [];
  for (const { pattern, reason, weight } of patterns) {
    if (!pattern.test(text)) continue;
    score += weight;
    reasons.push(reason);
  }
  return { tone: score >= 2 ? 'hawkish' : score <= -2 ? 'dovish' : 'balanced', reasons };
}

const decode = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&#8217;/g, '’')
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const paragraphsOf = (html: string) => [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => decode(m[1])).filter(Boolean);

const clip = (p: string) => (p.length > MAX_PARAGRAPH_CHARS ? `${p.slice(0, MAX_PARAGRAPH_CHARS).trimEnd()}…` : p);

/** "2026-10-28" → "20261028"; Fed karar metni adresi karar gününe göre. */
const compactDate = (at: string) => at.slice(0, 10).replaceAll('-', '');

async function fedStatement(event: EconomicEvent): Promise<{ url: string; statement: Statement | null }> {
  const url = `https://www.federalreserve.gov/newsevents/pressreleases/monetary${compactDate(event.at)}a.htm`;
  const html = await (await request(url, HEADERS)).text();
  const article = html.split(/id="article"/)[1] ?? html;
  const all = paragraphsOf(article);
  const start = all.findIndex((p) => /^The Committee decided/i.test(p));
  // Karar metni oy listesiyle biter; sonrası sayfa altbilgisi.
  const end = all.findIndex((p, i) => i > start && /^Voting/i.test(p));
  const body = all
    .slice(Math.max(start, 0), end > start ? end : undefined)
    .filter((p) => p.length > 40 && !/^For release|^For media inquiries|^Implementation Note/i.test(p));
  const text = all.join(' ');
  const count = /by an? (\d+)\s*[–-]\s*(\d+) vote/i.exec(text);
  const unanimous = /unanimous/i.test(text);
  const dissent = /preferred to (raise|lower)/i.exec(text)?.[1]?.toLowerCase() as 'raise' | 'lower' | undefined;
  const votes = count
    ? { for: Number(count[1]), against: Number(count[2]), dissent }
    : unanimous
      ? { for: 12, against: 0 }
      : undefined;
  const { tone, reasons } = toneOf(text, FED_TONE, dissent === 'raise' ? 1 : dissent === 'lower' ? -1 : 0);
  if (votes?.against && dissent) {
    reasons.push(`${votes.against} üye ${dissent === 'raise' ? 'artırım' : 'indirim'} yönünde karşı oy kullandı`);
  }
  if (!body.length) return { url, statement: null };
  return {
    url,
    statement: { language: 'en', paragraphs: body.slice(0, MAX_PARAGRAPHS).map(clip), tone, toneReasons: reasons, votes },
  };
}

/**
 * TCMB yıllık basın duyuruları listesinde karar günü tarihli "Faiz Oranlarına İlişkin Basın Duyurusu".
 * Ticari kullanım izni yoksa yalnızca duyurunun adresi bulunur; metin indirilmez, alıntılanmaz.
 */
async function tcmbStatement(event: EconomicEvent): Promise<{ url: string; statement: Statement | null }> {
  const [y, m, d] = event.at.slice(0, 10).split('-');
  const list = await (await request(TCMB_PRESS_LIST(Number(y)), HEADERS)).text();
  const entries = list.matchAll(
    /<a class="collection-title" href="([^"]+)"[^>]*title="Faiz Oranlarına İlişkin Basın Duyurusu[^"]*"[\s\S]*?collection-tag">\s*(\d{2})\/(\d{2})\/(\d{4})/g,
  );
  const match = [...entries].find(([, , dd, mm, yyyy]) => dd === d && mm === m && yyyy === y);
  if (!match) return { url: TCMB_PRESS_LIST(Number(y)), statement: null };
  const url = `${TCMB_BASE}${match[1]}`;
  if (!dataLicenses.tcmb) return { url, statement: null };
  const html = await (await request(url, HEADERS)).text();
  const all = paragraphsOf(html);
  const start = all.findIndex((p) => /Para Politikası Kurulu \(Kurul\)/.test(p));
  const body = (start >= 0 ? all.slice(start) : all).filter((p) => p.length > 60 && !/Toplantı Özeti .*yayımlanacaktır/.test(p));
  const { tone, reasons } = toneOf(all.join(' '), TCMB_TONE, 0);
  if (!body.length) return { url, statement: null };
  return { url, statement: { language: 'tr', paragraphs: body.slice(0, MAX_PARAGRAPHS).map(clip), tone, toneReasons: reasons } };
}

function dataSource(event: EconomicEvent): EconomicEventReport['source'] {
  if (event.country === 'TR') {
    return { label: 'TÜİK haber bülteni', url: event.sourceUrl ?? 'https://data.tuik.gov.tr/Kategori/GetKategori?p=enflasyon-ve-fiyat-106&dil=1' };
  }
  return event.kind === 'inflation'
    ? { label: 'ABD Çalışma İstatistikleri Bürosu (BLS) – TÜFE', url: 'https://www.bls.gov/news.release/cpi.toc.htm' }
    : { label: 'ABD Çalışma İstatistikleri Bürosu (BLS) – İstihdam', url: 'https://www.bls.gov/news.release/empsit.toc.htm' };
}

/** Takvimde yoksa ya da henüz açıklanmadıysa `null`. */
export async function getReport(id: string, now = Date.now()): Promise<EconomicEventReport | null> {
  const event = await findEvent(id, now);
  if (!event || Date.parse(event.at) > now) return null;

  const hit = cache.get(id);
  // Sonuç sonradan gelmiş olabilir; olay her seferinde güncel takvimden alınır.
  if (hit && now - hit.at < hit.ttl) return { ...hit.report, event };

  let report: EconomicEventReport;
  if (event.kind === 'rate') {
    const fallback = event.country === 'US'
      ? { label: 'Federal Reserve – FOMC kararı', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' }
      : { label: 'TCMB – Faiz kararı duyurusu', url: TCMB_PRESS_LIST(Number(event.at.slice(0, 4))) };
    try {
      const { url, statement } = event.country === 'US' ? await fedStatement(event) : await tcmbStatement(event);
      report = { event, source: { label: fallback.label, url }, statement: statement ?? undefined };
    } catch {
      report = { event, source: fallback };
    }
  } else {
    report = { event, source: dataSource(event) };
  }
  // İzinsiz TCMB raporunda metin hiç beklenmez; eksik sayılıp sık yeniden denenmez.
  const statementExpected = event.kind === 'rate' && (event.country === 'US' || dataLicenses.tcmb);
  const complete = !statementExpected || !!report.statement;
  cache.set(id, { at: now, ttl: complete ? REPORT_TTL_MS : MISSING_STATEMENT_TTL_MS, report });
  return report;
}
