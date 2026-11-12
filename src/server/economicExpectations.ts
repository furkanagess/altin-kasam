/**
 * Takvim olaylarının beklentileri (yalnızca sunucu). Ücretsiz ve resmî kaynağı olanlar:
 * - TCMB faiz kararı ve TÜİK TÜFE: TCMB Piyasa Katılımcıları Anketi, EVDS `bie_pkauo` (uygun
 *   ortalamalar; `EVDS_API_KEY`). Anket, aynı ay toplantı varsa ondan önce yayımlanır; "ilk / ikinci /
 *   üçüncü toplantı" beklentisi anket ayından itibaren sıradaki toplantılardır.
 * - ABD TÜFE: Cleveland Fed enflasyon anlık tahmini (anahtarsız; anket değil, model tahmini).
 * Fed kararı ve tarım dışı istihdam için ücretsiz konsensüs yok; bu olaylarda beklenti gösterilmez.
 * İki kaynak da ticari kullanım için yazılı izin ister; izin bayrağı kapalıyken indirilmez
 * (`dataLicenses`).
 */

import type { EconomicEvent, EconomicEventExpectation } from '@/src/domain/models';
import { dataLicenses } from '@/src/server/dataLicenses';

const EVDS = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
const SURVEY_SERIES = {
  rate1: 'TP.PKAUO.S04.C.U',
  rate2: 'TP.PKAUO.S04.F.U',
  rate3: 'TP.PKAUO.S04.G.U',
  /** Cari ayın aylık TÜFE beklentisi. */
  cpi0: 'TP.PKAUO.S01.A.U',
  /** Bir ay sonrasının aylık TÜFE beklentisi; cari ayın anketi henüz yoksa. */
  cpi1: 'TP.PKAUO.S01.B.U',
} as const;
const RATE_KEYS = ['rate1', 'rate2', 'rate3'] as const;
const NOWCAST = (file: 'month' | 'year') =>
  `https://www.clevelandfed.org/-/media/files/webcharts/inflationnowcasting/nowcast_${file}.json?sc_lang=en`;

/** Anket ayda bir, tahmin günde bir güncellenir. */
const TTL_MS = 6 * 60 * 60_000;
const FAILED_TTL_MS = 15 * 60_000;
/** Cleveland Fed dosyaları ~7,5 MB. */
const TIMEOUT_MS = 15_000;
const SURVEY_MONTHS = 14;

type SurveyKey = keyof typeof SURVEY_SERIES;
type Survey = Partial<Record<SurveyKey, number>>;
type Nowcast = { yoy: Map<string, number>; mom: Map<string, number> };
export type ExpectationData = { surveys: Map<string, Survey> | null; nowcast: Nowcast | null };

const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const twoDecimals = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

let cache: { at: number; ttl: number; data: ExpectationData } | null = null;
let pending: Promise<ExpectationData> | null = null;

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** "2026-9" → "2026-09". */
function normalizeMonth(raw: unknown): string | null {
  const match = typeof raw === 'string' ? /^(\d{4})-(\d{1,2})/.exec(raw) : null;
  return match ? `${match[1]}-${match[2].padStart(2, '0')}` : null;
}

function shiftMonth(ref: string, delta: number): string {
  const [y, m] = ref.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const monthLabel = (month: string) => `${TR_MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

async function loadSurveys(key: string, now: number): Promise<Map<string, Survey>> {
  const end = new Date(now).toISOString().slice(0, 7);
  const start = shiftMonth(end, -SURVEY_MONTHS);
  const toEvds = (month: string) => `01-${month.slice(5, 7)}-${month.slice(0, 4)}`;
  const series = Object.values(SURVEY_SERIES).join('-');
  const url = `${EVDS}/series=${series}&startDate=${toEvds(start)}&endDate=${toEvds(end)}&type=json`;
  const data = (await getJson(url, { key })) as { items?: Record<string, unknown>[] };
  const surveys = new Map<string, Survey>();
  for (const item of data.items ?? []) {
    const month = normalizeMonth(item.Tarih);
    if (!month) continue;
    const survey: Survey = {};
    for (const [name, code] of Object.entries(SURVEY_SERIES) as [SurveyKey, string][]) {
      const raw = item[code.replaceAll('.', '_')];
      const value = raw == null ? NaN : Number(String(raw).replace(',', '.'));
      if (Number.isFinite(value)) survey[name] = value;
    }
    if (Object.keys(survey).length) surveys.set(month, survey);
  }
  return surveys;
}

type NowcastChart = {
  chart?: { subcaption?: string };
  dataset?: { seriesname?: string; data?: { value?: string }[] }[];
};

/** Her hedef ay için "CPI Inflation" serisinin son (açıklamadan önceki en güncel) tahmini. */
async function loadNowcastFile(file: 'month' | 'year'): Promise<Map<string, number>> {
  const charts = (await getJson(NOWCAST(file))) as NowcastChart[];
  const byMonth = new Map<string, number>();
  for (const chart of Array.isArray(charts) ? charts : []) {
    const month = normalizeMonth(chart.chart?.subcaption);
    const series = chart.dataset?.find((d) => d.seriesname === 'CPI Inflation');
    const last = [...(series?.data ?? [])].reverse().find((d) => d.value !== '' && d.value != null);
    if (month && last && Number.isFinite(Number(last.value))) byMonth.set(month, Number(last.value));
  }
  return byMonth;
}

async function load(now: number): Promise<{ data: ExpectationData; failed: boolean }> {
  const key = process.env.EVDS_API_KEY;
  const nowcast = dataLicenses.clevelandFed;
  const [surveys, yoy, mom] = await Promise.allSettled([
    key && dataLicenses.tcmb ? loadSurveys(key, now) : Promise.resolve(null),
    nowcast ? loadNowcastFile('year') : Promise.resolve(null),
    nowcast ? loadNowcastFile('month') : Promise.resolve(null),
  ]);
  const value = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
  const yoyMap = value(yoy);
  const momMap = value(mom);
  return {
    data: { surveys: value(surveys), nowcast: yoyMap || momMap ? { yoy: yoyMap ?? new Map(), mom: momMap ?? new Map() } : null },
    failed: [surveys, yoy, mom].some((r) => r.status === 'rejected'),
  };
}

/** Kaynak hata verirse önceki veri korunur ve kısa süre sonra yeniden denenir; takvimi bekletmez. */
export async function expectationData(now = Date.now()): Promise<ExpectationData> {
  if (cache && now - cache.at < cache.ttl) return cache.data;
  pending ??= load(now)
    .then(({ data, failed }) => {
      const merged: ExpectationData = {
        surveys: data.surveys ?? cache?.data.surveys ?? null,
        nowcast: data.nowcast ?? cache?.data.nowcast ?? null,
      };
      cache = { at: now, ttl: failed ? FAILED_TTL_MS : TTL_MS, data: merged };
      return merged;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** "%36,00" → 36; ayrıştırılamazsa `null`. */
function parsePercent(text: string | undefined): number | null {
  if (!text) return null;
  const value = Number(text.replace('%', '').replace(/\./g, '').replace(',', '.').trim());
  return Number.isFinite(value) ? value : null;
}

function surpriseOf(actual: number | null, expected: number, tolerance: number): EconomicEventExpectation['surprise'] {
  if (actual == null) return undefined;
  const diff = actual - expected;
  return Math.abs(diff) < tolerance ? 'inline' : diff > 0 ? 'above' : 'below';
}

const surveySource = (month: string) => `TCMB Piyasa Katılımcıları Anketi (${monthLabel(month)})`;

function trRateExpectation(event: EconomicEvent, surveys: Map<string, Survey>, all: EconomicEvent[]): EconomicEventExpectation | undefined {
  const eventMonth = event.at.slice(0, 7);
  const month = [...surveys.keys()].sort().reverse().find((m) => m <= eventMonth && surveys.get(m)?.rate1 != null);
  if (!month) return undefined;
  const meetings = all
    .filter((e) => e.country === 'TR' && e.kind === 'rate' && e.at.slice(0, 7) >= month)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const index = meetings.findIndex((e) => e.id === event.id);
  const expected = index >= 0 && index < RATE_KEYS.length ? surveys.get(month)?.[RATE_KEYS[index]] : undefined;
  if (expected == null) return undefined;
  return {
    value: `%${twoDecimals.format(expected)}`,
    source: surveySource(month),
    kind: 'survey',
    // Anket ortalamasıdır; çeyrek puandan küçük sapma "uyumlu" sayılır.
    surprise: surpriseOf(parsePercent(event.result?.value), expected, 0.25),
  };
}

function trCpiExpectation(event: EconomicEvent, surveys: Map<string, Survey>): EconomicEventExpectation | undefined {
  if (!event.ref) return undefined;
  const current = surveys.get(event.ref)?.cpi0;
  const fallback = surveys.get(shiftMonth(event.ref, -1))?.cpi1;
  const expected = current ?? fallback;
  if (expected == null) return undefined;
  const month = current != null ? event.ref : shiftMonth(event.ref, -1);
  const actual = event.result?.monthly;
  return {
    value: `%${twoDecimals.format(expected)}`,
    basis: 'Aylık',
    source: surveySource(month),
    kind: 'survey',
    surprise: surpriseOf(parsePercent(actual), expected, 0.1),
    actual,
  };
}

function usCpiExpectation(event: EconomicEvent, nowcast: Nowcast): EconomicEventExpectation | undefined {
  if (!event.ref) return undefined;
  // Sonuç aylık açıklandıysa (yıllık oran yayımlanmadı) tahmin de aylık karşılaştırılır.
  const monthly = event.result?.detail?.startsWith('Aylık') ?? false;
  const expected = (monthly ? nowcast.mom : nowcast.yoy).get(event.ref);
  if (expected == null) return undefined;
  const rounded = Number(expected.toFixed(1));
  const actual = parsePercent(event.result?.value);
  return {
    value: `%${oneDecimal.format(rounded)}`,
    basis: monthly ? 'Aylık' : 'Yıllık',
    source: 'Cleveland Fed anlık tahmini',
    kind: 'nowcast',
    // Sonuç bir ondalıkla yayımlanır; aynı yuvarlamada eşitse uyumlu.
    surprise: actual == null ? undefined : surpriseOf(Number(actual.toFixed(1)), rounded, 0.05),
  };
}

/** Beklenti bulunamazsa olay olduğu gibi döner. */
export function withExpectation(event: EconomicEvent, data: ExpectationData, all: EconomicEvent[]): EconomicEvent {
  let expectation: EconomicEventExpectation | undefined;
  if (event.country === 'TR' && data.surveys && dataLicenses.tcmb) {
    if (event.kind === 'rate') expectation = trRateExpectation(event, data.surveys, all);
    else if (event.kind === 'inflation') expectation = trCpiExpectation(event, data.surveys);
  } else if (event.country === 'US' && event.kind === 'inflation' && data.nowcast && dataLicenses.clevelandFed) {
    expectation = usCpiExpectation(event, data.nowcast);
  }
  return expectation ? { ...event, expectation } : event;
}
