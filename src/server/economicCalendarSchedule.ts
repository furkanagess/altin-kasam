/**
 * Ekonomik takvim, yalnızca resmî kaynaklardan; elle tutulan tarih yoktur. Yalnızca sunucu ucu
 * (`app/api/calendar+api.ts`) kullanır; uygulama paketine girmez.
 *
 * - Fed faiz kararları: federalreserve.gov FOMC takvimi (karar ikinci gün 14:00 ET)
 * - ABD TÜFE ve tarım dışı istihdam günleri: BLS yayın takvimi, FRED `release/dates` üzerinden
 *   (CPI = 10, Employment Situation = 50; 08:30 ET). BLS sayfası sunucu isteklerini engellediği
 *   için FRED kullanılır; FRED yalnızca yaklaşan ilk yayını bilir.
 * - TCMB faiz kararları: tcmb.gov.tr "Takvim" sayfası (14:00 TSİ)
 * - TÜİK TÜFE: TÜİK Ulusal Veri Yayımlama Takvimi'nin yıllık listesi (saat listede yazılı)
 *
 * Kurum henüz yayımlamadıysa (ör. TÜİK 2027 takvimi) o olaylar listede olmaz.
 */

import type { EconomicEvent } from '@/src/domain/models';

const TIMEOUT_MS = 10_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AltinKasam/1.0)';

const FOMC_URL = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
const TCMB_URL = 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim';
const TUIK_URL = 'https://takvim.tuik.gov.tr/Kurumsal/GetYillikHaberBulteniListesi?yil=';
const FRED_RELEASE_DATES = 'https://api.stlouisfed.org/fred/release/dates';
const FRED_RELEASES = { cpi: 10, jobs: 50 } as const;

const EN_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const TR_MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const TR_MONTH_LABELS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Zaman aşımında bir kez yeniden denenir; kurum sunucuları ilk istekte bazen yanıtsız kalıyor. */
async function fetchText(url: string, attempt = 1): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if (attempt < 2) return fetchText(url, attempt + 1);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

/** `timeZone` saat dilimindeki duvar saatinin UTC karşılığı; yaz saati geçişleri dahil. */
function zonedToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): number {
  const offsetAt = (utc: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      })
        .formatToParts(utc)
        .map((p) => [p.type, Number(p.value)]),
    );
    return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) - utc;
  };
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let utc = wall - offsetAt(wall);
  utc = wall - offsetAt(utc);
  return utc;
}

/** Türkiye 2016'dan beri sürekli UTC+3. */
function toTurkeyIso(utc: number): string {
  return `${new Date(utc + 3 * 3_600_000).toISOString().slice(0, 19)}+03:00`;
}

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;
const periodLabel = (ref: string) => `${TR_MONTH_LABELS[Number(ref.slice(5, 7)) - 1]} verisi`;

/** Yayın ayından bir önceki ay; ABD TÜFE ve istihdam bir önceki ayın verisidir. */
function previousMonth(year: number, month: number): string {
  return month === 1 ? monthKey(year - 1, 12) : monthKey(year, month - 1);
}

/** FOMC sayfası: yıl başlığı altında "January" + "27-28*" satırları; iki aya yayılan toplantı "Apr/May" + "30-1". */
export async function fedMeetings(): Promise<EconomicEvent[]> {
  const html = await fetchText(FOMC_URL);
  const events: EconomicEvent[] = [];
  const sections = html.split(/<h4>\s*<a[^>]*>\s*(\d{4}) FOMC Meetings\s*<\/a>\s*<\/h4>/);
  for (let i = 1; i < sections.length; i += 2) {
    const year = Number(sections[i]);
    const body = sections[i + 1] ?? '';
    const rows = body.matchAll(
      /fomc-meeting__month[^>]*>\s*<strong>([^<]+)<\/strong>[\s\S]*?fomc-meeting__date[^>]*>\s*([^<]+?)\s*<\/div>/g,
    );
    for (const [, monthText, dateText] of rows) {
      const days = /^(\d{1,2})(?:-(\d{1,2}))?\*?$/.exec(dateText.trim());
      if (!days) continue; // "(unscheduled)", "(notation vote)" gibi olağan dışı kayıtlar
      const months = monthText.toLowerCase().split('/').map((m) => EN_MONTHS.findIndex((n) => n.startsWith(m.trim().slice(0, 3))));
      const decisionMonth = (months[months.length - 1] ?? -1) + 1;
      const decisionDay = Number(days[2] ?? days[1]);
      if (decisionMonth < 1) continue;
      const utc = zonedToUtc(year, decisionMonth, decisionDay, 14, 0, 'America/New_York');
      events.push({
        id: `us-fomc-${monthKey(year, decisionMonth)}`,
        at: toTurkeyIso(utc),
        country: 'US',
        kind: 'rate',
        title: 'Fed faiz kararı',
      });
    }
  }
  return events;
}

/** FRED, BLS'in duyurduğu yaklaşan yayın gününü ve geçmiş yayınları verir. */
export async function blsReleases(fredKey: string, since: number): Promise<EconomicEvent[]> {
  const start = new Date(since).toISOString().slice(0, 10);
  const lists = await Promise.all(
    (Object.entries(FRED_RELEASES) as [keyof typeof FRED_RELEASES, number][]).map(async ([kind, id]) => {
      const url = `${FRED_RELEASE_DATES}?release_id=${id}&api_key=${encodeURIComponent(fredKey)}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${start}&realtime_end=9999-12-31&sort_order=asc`;
      const data = JSON.parse(await fetchText(url)) as { release_dates?: { date: string }[] };
      return (data.release_dates ?? []).map(({ date }): EconomicEvent => {
        const [year, month, day] = date.split('-').map(Number);
        const ref = previousMonth(year, month);
        const utc = zonedToUtc(year, month, day, 8, 30, 'America/New_York');
        return kind === 'cpi'
          ? { id: `us-cpi-${ref}`, at: toTurkeyIso(utc), country: 'US', kind: 'inflation', title: 'Enflasyon (TÜFE)', period: periodLabel(ref), ref }
          : { id: `us-nfp-${ref}`, at: toTurkeyIso(utc), country: 'US', kind: 'jobs', title: 'Tarım dışı istihdam', period: periodLabel(ref), ref };
      });
    }),
  );
  return lists.flat();
}

/** TCMB "Takvim" tablosu: ilk sütun PPK karar günü ("22 Ocak 2026"). */
export async function tcmbMeetings(): Promise<EconomicEvent[]> {
  const html = await fetchText(TCMB_URL);
  const events: EconomicEvent[] = [];
  for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const first = /<td[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1];
    if (!first) continue;
    const text = first.replace(/<[^>]+>|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    const match = /^(\d{1,2}) (\S+) (\d{4})$/.exec(text);
    if (!match) continue;
    const month = TR_MONTHS.indexOf(match[2].toLocaleLowerCase('tr-TR')) + 1;
    if (month < 1) continue;
    const year = Number(match[3]);
    const day = Number(match[1]);
    events.push({
      id: `tr-ppk-${monthKey(year, month)}`,
      at: `${monthKey(year, month)}-${String(day).padStart(2, '0')}T14:00:00+03:00`,
      country: 'TR',
      kind: 'rate',
      title: 'TCMB faiz kararı',
    });
  }
  return events;
}

type TuikBulletin = { adi?: string; gTarih?: string; donemi?: string; sorumluKisaAd?: string; link?: string };

/** TÜİK yıllık yayın listesi; yayımlanmış ve yayımlanacak bültenler ayrı listelerdedir. */
export async function tuikCpiReleases(years: number[]): Promise<EconomicEvent[]> {
  const lists = await Promise.all(
    years.map(async (year) => {
      const data = JSON.parse(await fetchText(`${TUIK_URL}${year}`)) as Record<string, TuikBulletin[] | undefined>;
      return [...(data.yayindaOlanlarList ?? []), ...(data.yayindaOlmayanlarList ?? [])];
    }),
  );
  const events = new Map<string, EconomicEvent>();
  for (const item of lists.flat()) {
    if (item.sorumluKisaAd !== 'TÜİK' || !item.adi?.startsWith('Tüketici Fiyat Endeksi') || !item.gTarih) continue;
    const period = /^(\S+) (\d{4})$/.exec(item.donemi?.trim() ?? '');
    const month = period ? TR_MONTHS.indexOf(period[1].toLocaleLowerCase('tr-TR')) + 1 : 0;
    if (!period || month < 1) continue;
    const ref = monthKey(Number(period[2]), month);
    // `gTarih` Türkiye saatiyle ve saat dilimi bilgisi olmadan gelir ("2026-12-03T10:00:00").
    events.set(ref, {
      id: `tr-cpi-${ref}`,
      at: `${item.gTarih.slice(0, 19)}+03:00`,
      country: 'TR',
      kind: 'inflation',
      title: 'TÜİK enflasyon (TÜFE)',
      period: periodLabel(ref),
      ref,
      sourceUrl: item.link?.trim() ? encodeURI(item.link.trim()) : undefined,
    });
  }
  return [...events.values()];
}
