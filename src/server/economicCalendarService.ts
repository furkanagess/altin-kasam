/**
 * Ekonomik takvim servisi (yalnızca sunucu): resmî takvimlerden derlenen olaylar (bkz.
 * `economicCalendarSchedule`) ve geçmiş olayların açıklanan değerleri. Takvim ve rapor uçları
 * aynı önbellekleri paylaşır. Anahtarlar yalnızca
 * sunucuda durur (`FRED_API_KEY`, `EVDS_API_KEY`); tanımlı değilse ilgili sonuçlar boş kalır,
 * takvim yine döner.
 *
 * Kaynaklar:
 * - Fed faiz bandı: FRED `DFEDTARL` / `DFEDTARU` (günlük; karardan sonraki gün yürürlüğe girer)
 * - ABD TÜFE: FRED `CPIAUCNS` (mevsimsellikten arındırılmamış endeks; yıllık değişim BLS'in
 *   manşet oranıyla aynı yöntemle hesaplanır). Yıllık oran yoksa `CPIAUCSL` aylık değişimi
 * - Tarım dışı istihdam: FRED `PAYEMS` (bin kişi; aylık fark)
 * - TCMB politika faizi: TCMB "1 Hafta Repo" sayfası (anahtarsız; tarih yürürlük günüdür)
 * - TÜİK TÜFE: TCMB EVDS `TP.TUKFIY2025.GENEL` (2025=100; Ocak 2026'dan beri, eski `TP.FG.J0`
 *   durdu), yıllık yüzde değişim (`formulas=3`)
 *
 * Kaynaklar sonucu açıklamadan sonra yayımlar; FRED ve EVDS birkaç saat gecikebilir.
 * Beklentiler (TCMB anketi, Cleveland Fed tahmini) `economicExpectations` içinde.
 */

import type { EconomicEvent, EconomicEventResult } from '@/src/domain/models';
import { blsReleases, fedMeetings, tcmbMeetings, tuikCpiReleases } from '@/src/server/economicCalendarSchedule';
import { expectationData, withExpectation } from '@/src/server/economicExpectations';

const TIMEOUT_MS = 8_000;
/** Zaman aşımında bir kez yeniden denenir; TCMB ilk istekte bazen yanıtsız kalıyor. */
const ATTEMPTS = 2;
/** Bu süreden eski olayların sonucu aranmaz ve listeye konmaz. */
const RECENT_WINDOW_MS = 21 * 86_400_000;
/** Bulunan sonuç değişmez; bulunamayan kısa aralıkla yeniden denenir. */
const RESULT_TTL_MS = 24 * 60 * 60_000;
const PENDING_TTL_MS = 15 * 60_000;
const RESPONSE_TTL_MS = 5 * 60_000;
/** Bir kaynak hata verdiyse yanıt kısa tutulur ki sonuç kısa sürede gelsin. */
const DEGRADED_RESPONSE_TTL_MS = 30_000;
/** Kurum takvimleri seyrek değişir. */
const SCHEDULE_TTL_MS = 6 * 60 * 60_000;
/** TCMB sayfasında karardan sonra yeni satır yoksa bu süre geçince faiz "sabit" sayılır. */
const HOLD_AFTER_MS = 24 * 60 * 60_000;

const FRED = 'https://api.stlouisfed.org/fred/series/observations';
const EVDS = 'https://evds3.tcmb.gov.tr/igmevdsms-dis';
/** TÜİK TÜFE genel endeksi; formül uygulanınca alan adı "TP_TUKFIY2025_GENEL-3" olarak gelir. */
const EVDS_CPI_SERIES = 'TP.TUKFIY2025.GENEL';
const TCMB_REPO =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB%2BTR/Main%2BMenu/Temel%2BFaaliyetler/Para%2BPolitikasi/Merkez%2BBankasi%2BFaiz%2BOranlari/1%2BHafta%2BRepo';

type Observation = { date: string; value: number };

const resultCache = new Map<string, { at: number; result: EconomicEventResult | null }>();
/** Kaynak başına son başarılı takvim; kaynak geçici olarak yanıt vermezse bu kullanılır. */
const scheduleCache = new Map<string, { at: number; events: EconomicEvent[] }>();
let responseCache: { at: number; ttl: number; body: CalendarBody } | null = null;

const rate = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0, signDisplay: 'always' });

export async function request(url: string, headers: Record<string, string> = {}, attempt = 1): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Gövde de zaman aşımı içinde okunur; yanıt yarıda kalırsa yeniden denenir.
    const body = await res.arrayBuffer();
    return new Response(body, { status: res.status, headers: res.headers });
  } catch (e) {
    if (attempt < ATTEMPTS) return request(url, headers, attempt + 1);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/** "2026-10" ayından `delta` ay önce/sonra. */
function shiftMonth(ref: string, delta: number): string {
  const [y, m] = ref.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Karar gününün Türkiye takvimindeki tarihi ("2026-10-22"). */
const localDate = (at: string) => at.slice(0, 10);

const directionOf = (now: number, before: number): EconomicEventResult['direction'] =>
  Math.abs(now - before) < 1e-9 ? 'flat' : now > before ? 'up' : 'down';

async function fred(series: string, start: string, key: string): Promise<Observation[]> {
  const url = `${FRED}?series_id=${series}&api_key=${encodeURIComponent(key)}&file_type=json&observation_start=${start}`;
  const data = (await (await request(url)).json()) as { observations?: { date: string; value: string }[] };
  return (data.observations ?? [])
    .map((o) => ({ date: o.date, value: Number(o.value) }))
    .filter((o) => Number.isFinite(o.value));
}

function bpText(diff: number, cut: string, hike: string): string {
  const bp = Math.round(Math.abs(diff) * 100);
  return bp === 0 ? 'Sabit' : `${bp} bp ${diff < 0 ? cut : hike}`;
}

async function fedDecision(event: EconomicEvent, key: string): Promise<EconomicEventResult | null> {
  const day = localDate(event.at);
  const start = new Date(Date.parse(event.at) - 10 * 86_400_000).toISOString().slice(0, 10);
  const [lower, upper] = await Promise.all([fred('DFEDTARL', start, key), fred('DFEDTARU', start, key)]);
  const pick = (obs: Observation[]) => ({
    before: [...obs].reverse().find((o) => o.date <= day),
    after: obs.find((o) => o.date > day),
  });
  const lo = pick(lower);
  const hi = pick(upper);
  if (!lo.after || !hi.after || !lo.before || !hi.before) return null;
  const range = (l: number, h: number) => `%${rate.format(l)}–${rate.format(h)}`;
  const diff = hi.after.value - hi.before.value;
  return {
    value: range(lo.after.value, hi.after.value),
    previous: range(lo.before.value, hi.before.value),
    detail: bpText(diff, 'indirim', 'artırım'),
    direction: directionOf(hi.after.value, hi.before.value),
  };
}

/** Bir aylık seriden `month` ayının değeri; yayımlanmamış ay (FRED'de ".") yoktur. */
const monthValue = (obs: Observation[], month: string) => obs.find((o) => o.date === `${month}-01`)?.value;

async function usInflation(event: EconomicEvent, key: string): Promise<EconomicEventResult | null> {
  if (!event.ref) return null;
  const ref = event.ref;
  const obs = await fred('CPIAUCNS', `${shiftMonth(ref, -13)}-01`, key);
  const yoy = (month: string) => {
    const now = monthValue(obs, month);
    const yearAgo = monthValue(obs, shiftMonth(month, -12));
    return now && yearAgo ? (now / yearAgo - 1) * 100 : undefined;
  };
  const current = yoy(ref);
  if (current != null) {
    const previous = yoy(shiftMonth(ref, -1));
    return {
      value: `%${oneDecimal.format(current)}`,
      previous: previous != null ? `%${oneDecimal.format(previous)}` : undefined,
      detail: 'Yıllık',
      direction: previous != null ? directionOf(Number(current.toFixed(1)), Number(previous.toFixed(1))) : undefined,
    };
  }
  // Ekim 2025 verisi ABD hükümet kapanması nedeniyle toplanamadı; BLS Ekim 2026'nın yıllık oranını
  // yayımlamadı. Endeks açıklandıysa mevsimsellikten arındırılmış aylık değişim gösterilir.
  if (monthValue(obs, ref) == null) return null;
  const sa = await fred('CPIAUCSL', `${shiftMonth(ref, -2)}-01`, key);
  const mom = (month: string) => {
    const now = monthValue(sa, month);
    const before = monthValue(sa, shiftMonth(month, -1));
    return now && before ? (now / before - 1) * 100 : undefined;
  };
  const monthly = mom(ref);
  if (monthly == null) return null;
  const previous = mom(shiftMonth(ref, -1));
  return {
    value: `%${oneDecimal.format(monthly)}`,
    previous: previous != null ? `%${oneDecimal.format(previous)}` : undefined,
    detail: 'Aylık; yıllık oran yayımlanmadı',
    direction: previous != null ? directionOf(Number(monthly.toFixed(1)), Number(previous.toFixed(1))) : undefined,
  };
}

async function payrolls(event: EconomicEvent, key: string): Promise<EconomicEventResult | null> {
  if (!event.ref) return null;
  const obs = await fred('PAYEMS', `${shiftMonth(event.ref, -3)}-01`, key);
  const at = (month: string) => monthValue(obs, month);
  const change = (month: string) => {
    const now = at(month);
    const before = at(shiftMonth(month, -1));
    return now != null && before != null ? now - before : undefined;
  };
  const current = change(event.ref);
  if (current == null) return null;
  const previous = change(shiftMonth(event.ref, -1));
  return {
    value: `${whole.format(current)} bin`,
    previous: previous != null ? `${whole.format(previous)} bin` : undefined,
    detail: 'Aylık değişim',
    direction: previous != null ? directionOf(current, previous) : undefined,
  };
}

/** TCMB sayfasındaki tablo: yürürlük tarihi, borç alma, borç verme (politika faizi). */
async function tcmbRates(): Promise<{ date: string; rate: number }[]> {
  const html = await (await request(TCMB_REPO, { 'User-Agent': 'Mozilla/5.0' })).text();
  const rows: { date: string; rate: number }[] = [];
  const pattern = /<td[^>]*>\s*(\d{2})\.(\d{2})\.(\d{4})\s*<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>\s*([\d.,]+)\s*<\/td>/g;
  for (const m of html.matchAll(pattern)) {
    const value = Number(m[4].replace(',', '.'));
    if (Number.isFinite(value)) rows.push({ date: `${m[3]}-${m[2]}-${m[1]}`, rate: value });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

async function tcmbDecision(event: EconomicEvent, now: number): Promise<EconomicEventResult | null> {
  const rows = await tcmbRates();
  const day = localDate(event.at);
  const windowEnd = new Date(Date.parse(`${day}T00:00:00Z`) + 4 * 86_400_000).toISOString().slice(0, 10);
  const index = rows.findIndex((r) => r.date > day && r.date <= windowEnd);
  const format = (v: number) => `%${rate.format(v)}`;
  if (index > 0) {
    const after = rows[index].rate;
    const before = rows[index - 1].rate;
    return {
      value: format(after),
      previous: format(before),
      detail: bpText(after - before, 'indirim', 'artırım'),
      direction: directionOf(after, before),
    };
  }
  // Faiz değişmediyse tabloya satır eklenmez; karar üzerinden bir gün geçtiyse son oran geçerlidir.
  const last = [...rows].reverse().find((r) => r.date <= day);
  if (!last || now - Date.parse(event.at) < HOLD_AFTER_MS) return null;
  return { value: format(last.rate), previous: format(last.rate), detail: 'Sabit', direction: 'flat' };
}

/** EVDS tarih alanı aylık seride "2026-9" biçimindedir; "9-2026" de kabul edilir. */
function evdsMonth(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const iso = /^(\d{4})-(\d{1,2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}`;
  const tr = /(\d{1,2})-(\d{4})$/.exec(raw);
  return tr ? `${tr[2]}-${tr[1].padStart(2, '0')}` : null;
}

async function trInflation(event: EconomicEvent, key: string): Promise<EconomicEventResult | null> {
  if (!event.ref) return null;
  const toEvds = (month: string) => `01-${month.slice(5, 7)}-${month.slice(0, 4)}`;
  // Aynı seri iki formülle: 1 aylık, 3 yıllık yüzde değişim (alanlar "-1" ve "-3" ekiyle gelir).
  const url = `${EVDS}/series=${EVDS_CPI_SERIES}-${EVDS_CPI_SERIES}&startDate=${toEvds(shiftMonth(event.ref, -1))}&endDate=${toEvds(event.ref)}&type=json&formulas=3-1`;
  const data = (await (await request(url, { key })).json()) as { items?: Record<string, unknown>[] };
  const field = EVDS_CPI_SERIES.replaceAll('.', '_');
  const yearly = new Map<string, number>();
  const monthly = new Map<string, number>();
  for (const item of data.items ?? []) {
    const month = evdsMonth(item.Tarih);
    if (!month) continue;
    const read = (suffix: string) => Number(String(item[`${field}-${suffix}`] ?? '').replace(',', '.'));
    if (Number.isFinite(read('3')) && item[`${field}-3`] != null) yearly.set(month, read('3'));
    if (Number.isFinite(read('1')) && item[`${field}-1`] != null) monthly.set(month, read('1'));
  }
  const current = yearly.get(event.ref);
  if (current == null) return null;
  const previous = yearly.get(shiftMonth(event.ref, -1));
  const month = monthly.get(event.ref);
  return {
    value: `%${rate.format(current)}`,
    previous: previous != null ? `%${rate.format(previous)}` : undefined,
    detail: 'Yıllık',
    direction: previous != null ? directionOf(current, previous) : undefined,
    monthly: month != null ? `%${rate.format(month)}` : undefined,
  };
}

async function resultOf(event: EconomicEvent, now: number): Promise<EconomicEventResult | null> {
  const fredKey = process.env.FRED_API_KEY;
  const evdsKey = process.env.EVDS_API_KEY;
  if (event.country === 'US') {
    if (!fredKey) return null;
    if (event.kind === 'rate') return fedDecision(event, fredKey);
    if (event.kind === 'inflation') return usInflation(event, fredKey);
    return payrolls(event, fredKey);
  }
  if (event.kind === 'rate') return tcmbDecision(event, now);
  if (event.kind === 'inflation' && evdsKey) return trInflation(event, evdsKey);
  return null;
}

/** `failed`: kaynak hata verdi; sonuç önbelleğe alınmaz, sonraki istekte yeniden denenir. */
async function cachedResult(event: EconomicEvent, now: number): Promise<{ result: EconomicEventResult | null; failed: boolean }> {
  const hit = resultCache.get(event.id);
  if (hit && now - hit.at < (hit.result ? RESULT_TTL_MS : PENDING_TTL_MS)) return { result: hit.result, failed: false };
  try {
    const result = await resultOf(event, now);
    resultCache.set(event.id, { at: now, result });
    return { result, failed: false };
  } catch {
    // Önceki bulunmuş sonuç varsa korunur.
    return { result: hit?.result ?? null, failed: true };
  }
}

async function cachedSchedule(source: string, now: number, load: () => Promise<EconomicEvent[]>): Promise<EconomicEvent[] | null> {
  const hit = scheduleCache.get(source);
  if (hit && now - hit.at < SCHEDULE_TTL_MS) return hit.events;
  try {
    const events = await load();
    if (events.length) {
      scheduleCache.set(source, { at: now, events });
      return events;
    }
  } catch {
    // Aşağıda son başarılı takvime düşülür.
  }
  return hit?.events ?? null;
}

async function schedule(now: number): Promise<{ events: EconomicEvent[]; sources: Record<string, boolean> }> {
  const fredKey = process.env.FRED_API_KEY;
  const date = new Date(now);
  const year = date.getFullYear();
  // TÜİK yıllık listesi büyük (~1,3 MB); önceki yıl yalnızca Ocak'ta (son açıklananlar), sonraki yıl
  // yalnızca son çeyrekte (yaklaşan) istenir.
  const tuikYears = [date.getMonth() === 0 ? year - 1 : null, year, date.getMonth() >= 9 ? year + 1 : null].filter(
    (y): y is number => y != null,
  );
  const [fed, bls, tcmb, tuik] = await Promise.all([
    cachedSchedule('fed', now, fedMeetings),
    fredKey ? cachedSchedule('bls', now, () => blsReleases(fredKey, now - RECENT_WINDOW_MS)) : Promise.resolve(null),
    cachedSchedule('tcmb', now, tcmbMeetings),
    cachedSchedule('tuik', now, () => tuikCpiReleases(tuikYears)),
  ]);
  const byId = new Map<string, EconomicEvent>();
  for (const event of [...(fed ?? []), ...(bls ?? []), ...(tcmb ?? []), ...(tuik ?? [])]) byId.set(event.id, event);
  return {
    events: [...byId.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    sources: { fed: !!fed, bls: !!bls, tcmb: !!tcmb, tuik: !!tuik },
  };
}

/** Tek olay ve (açıklandıysa) sonucu; tüm takvimin sonuçlarını hesaplamadan. */
export async function findEvent(id: string, now = Date.now()): Promise<EconomicEvent | null> {
  const cached = responseCache && now - responseCache.at < responseCache.ttl ? responseCache.body.events.find((e) => e.id === id) : null;
  if (cached) return cached;
  const [calendar, expectations] = await Promise.all([schedule(now), expectationData(now)]);
  const event = calendar.events.find((e) => e.id === id);
  if (!event) return null;
  if (Date.parse(event.at) > now) return withExpectation(event, expectations, calendar.events);
  const { result } = await cachedResult(event, now);
  return withExpectation(result ? { ...event, result } : event, expectations, calendar.events);
}

export type CalendarBody = {
  events: EconomicEvent[];
  generatedAt: string;
  sources: Record<string, boolean>;
};

/** Takvim boşsa (hiçbir kaynağa ulaşılamadı) `null`. */
export async function getCalendar(now = Date.now()): Promise<CalendarBody | null> {
  if (responseCache && now - responseCache.at < responseCache.ttl) return responseCache.body;
  const [calendar, expectations] = await Promise.all([schedule(now), expectationData(now)]);
  if (!calendar.events.length) return null;
  const events = calendar.events.filter((e) => Date.parse(e.at) > now - RECENT_WINDOW_MS);
  let degraded = false;
  const withResults = await Promise.all(
    events.map(async (event) => {
      if (Date.parse(event.at) > now) return withExpectation(event, expectations, calendar.events);
      const { result, failed } = await cachedResult(event, now);
      if (failed) degraded = true;
      return withExpectation(result ? { ...event, result } : event, expectations, calendar.events);
    }),
  );
  const body: CalendarBody = {
    events: withResults,
    generatedAt: new Date(now).toISOString(),
    sources: { ...calendar.sources, fred: !!process.env.FRED_API_KEY, evds: !!process.env.EVDS_API_KEY },
  };
  responseCache = { at: now, ttl: degraded ? DEGRADED_RESPONSE_TTL_MS : RESPONSE_TTL_MS, body };
  return body;
}
