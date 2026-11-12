import {
  RemoteEconomicCalendarDatasource,
  type IEconomicCalendarDatasource,
} from '@/src/data/datasources/economicCalendarDatasource';
import type { EconomicEventReport, StatementTone } from '@/src/data/datasources/economicReportTypes';
import type { CandlePoint, EconomicEvent } from '@/src/domain/models';

/** Piyasa tepkisi açıklamadan bu kadar sonrasına kadar ölçülür. */
export const REACTION_WINDOW_MS = 24 * 60 * 60_000;

export type PriceReaction = {
  /** Yüzde değişim. */
  change: number;
  /** Ölçülen süre; 24 saatten azsa açıklamadan bu yana geçen süredir. */
  hours: number;
};

export type ReportAnalysis = {
  /** Tek cümlelik özet, ör. "TCMB politika faizini 100 bp indirdi". */
  headline: string;
  /** Altın ve gümüş için olası anlamı; kurallara dayalı. */
  meaning: string[];
};

const TONE_TEXT: Record<'US' | 'TR', Record<StatementTone, string>> = {
  US: {
    hawkish:
      'Metnin tonu sıkı (şahin): faizlerin uzun süre yüksek kalabileceği ya da artırım ihtimali dolar ve reel faizi destekler; ons altın için baskı unsurudur.',
    dovish: 'Metnin tonu gevşek (güvercin): faiz indirimi beklentisini güçlendirir; ons altın ve gümüş için genellikle olumludur.',
    balanced: 'Metnin tonu dengeli: yön, bir sonraki veriler ve toplantıya dair beklentilerle belirlenecek.',
  },
  TR: {
    hawkish: 'Metin sıkı duruşun süreceğini vurguluyor: TL’yi destekler, dolar/TL ve gram altında yükselişi sınırlayabilir.',
    dovish: 'Metin gevşemeye alan açıyor: dolar/TL ve gram altın için yukarı yönlü etki yaratabilir.',
    balanced: 'Metnin tonu dengeli: adım atılsa da ihtiyatlı mesajlar korunuyor; etkisi sonraki verilere bağlı.',
  },
};

function headlineOf(event: EconomicEvent): string {
  const r = event.result;
  if (!r) return `${event.title} açıklandı; sonuç kaynakta henüz yayımlanmadı.`;
  const bank = event.country === 'US' ? 'Fed faiz bandını' : 'TCMB politika faizini';
  if (event.kind === 'rate') {
    if (r.direction === 'flat') return `${bank} ${r.value} düzeyinde sabit tuttu.`;
    const verb = r.direction === 'down' ? 'indirdi' : 'artırdı';
    const size = r.detail?.match(/^\d+ bp/)?.[0];
    return `${bank}${size ? ` ${size}` : ''} ${verb}: ${r.previous} → ${r.value}.`;
  }
  const where = event.country === 'US' ? 'ABD' : 'Türkiye';
  const previous = r.previous ? ` (önceki ${r.previous})` : '';
  if (event.kind === 'jobs') return `${where} ekonomisi ${event.period?.replace(' verisi', '') ?? ''} ayında ${r.value} istihdam ekledi${previous}.`;
  const basis = r.detail?.startsWith('Aylık') ? 'aylık' : 'yıllık';
  return `${where}’de enflasyon ${basis} ${r.value} oldu${previous}.`;
}

function dataMeaning(event: EconomicEvent): string[] {
  const direction = event.result?.direction;
  if (event.kind === 'rate') {
    if (event.country === 'US') {
      if (direction === 'down') return ['Faiz indirimi doları ve reel getirileri zayıflatma eğilimindedir; getirisi olmayan altın ve gümüş için genellikle destekleyicidir.'];
      if (direction === 'up') return ['Faiz artırımı doları ve reel getirileri güçlendirir; ons altın ve gümüş üzerinde baskı yaratabilir.'];
      return ['Faiz değişmedi; piyasanın yönünü kararın kendisinden çok metnin tonu ve bir sonraki toplantıya dair beklentiler belirler.'];
    }
    if (direction === 'down') return ['Faiz indirimi TL mevduatın getirisini düşürür; dolar/TL’de yükseliş ve değer koruma amaçlı talep üzerinden gram altını destekleyebilir.'];
    if (direction === 'up') return ['Faiz artırımı TL’yi destekler; dolar/TL ve gram altında yükselişi sınırlayabilir.'];
    return ['Faiz değişmedi; TL’nin seyri karar metnindeki yönlendirmeye ve enflasyon verilerine bağlı.'];
  }
  if (event.kind === 'jobs') {
    if (direction === 'up') return ['İstihdam artışı önceki aydan güçlü: ekonominin sağlam olduğuna işaret eder, faiz indirimi beklentisini zayıflatıp ons altına baskı yapabilir.'];
    if (direction === 'down') return ['İstihdam artışı yavaşladı: faiz indirimi beklentisini destekler; ons altın için genellikle olumludur.'];
    return ['İstihdam artışı önceki ayla benzer; etkisi beklentilere göre sınırlı kalabilir.'];
  }
  const notes: string[] = [];
  if (event.country === 'US') {
    if (direction === 'up') notes.push('Enflasyon önceki döneme göre hızlandı: Fed’in faiz indirme alanını daraltır, dolar ve reel faiz üzerinden onsa baskı yapabilir; öte yandan değer koruma talebini destekler.');
    else if (direction === 'down') notes.push('Enflasyon yavaşladı: faiz indirimi beklentisini güçlendirir; ons altın ve gümüş için genellikle olumludur.');
    else notes.push('Enflasyon önceki dönemle aynı; etkisi beklentilere göre sınırlı kalabilir.');
    if (event.result?.detail?.includes('yıllık oran yayımlanmadı')) {
      notes.push('BLS bu ay yıllık oranı yayımlamadı (Ekim 2025 verisi toplanamadı); değerlendirme aylık değişime dayanıyor.');
    }
    return notes;
  }
  if (direction === 'up') return ['Yıllık enflasyon yükseldi: değer koruma amaçlı altın talebini artırır ve TCMB’nin faiz indirim alanını daraltır.'];
  if (direction === 'down') return ['Yıllık enflasyon geriledi: TCMB’nin faiz indirimlerine alan açar; bu da TL ve gram altın üzerinden dolaylı etki yaratabilir.'];
  return ['Yıllık enflasyon önceki ayla aynı; TCMB’nin bir sonraki kararına dair beklentiler belirleyici olur.'];
}

/** Sonuç beklentiden saptıysa piyasanın asıl tepki verdiği kısım budur; ilk sırada gösterilir. */
function surpriseMeaning(event: EconomicEvent): string | null {
  const e = event.expectation;
  if (!event.result || !e?.surprise) return null;
  const at = `(${e.value})`;
  if (event.kind === 'rate') {
    if (e.surprise === 'below') return `Faiz, anket beklentisinin ${at} altında belirlendi: beklenenden gevşek adım TL üzerinde baskı yaratıp gram altını destekleyebilir.`;
    if (e.surprise === 'above') return `Faiz, anket beklentisinin ${at} üstünde kaldı: beklenenden sıkı duruş TL’yi destekler; gram altında yükselişi sınırlayabilir.`;
    return `Karar anket beklentisiyle ${at} uyumlu; büyük ölçüde fiyatlanmış olduğundan etkisi sınırlı kalabilir.`;
  }
  if (event.kind !== 'inflation') return null;
  if (event.country === 'TR') {
    if (e.surprise === 'above') return `Aylık enflasyon beklentinin ${at} üstünde geldi: TCMB’nin indirim alanını daraltabilir; değer koruma amaçlı altın talebini destekler.`;
    if (e.surprise === 'below') return `Aylık enflasyon beklentinin ${at} altında kaldı: dezenflasyonun sürdüğüne işaret eder, faiz indirimi beklentisini güçlendirir.`;
    return `Aylık enflasyon beklentiyle ${at} uyumlu; sürpriz olmadığı için piyasa etkisi sınırlı kalabilir.`;
  }
  if (e.surprise === 'above') return `Enflasyon Cleveland Fed tahmininin ${at} üstünde: Fed’in faiz indirimi beklentisini zayıflatabilir; dolar ve reel faiz üzerinden ons altına kısa vadede baskı yapabilir.`;
  if (e.surprise === 'below') return `Enflasyon Cleveland Fed tahmininin ${at} altında: faiz indirimi beklentisini güçlendirir; ons altın ve gümüş için genellikle olumludur.`;
  return `Enflasyon Cleveland Fed tahminiyle ${at} uyumlu; sürpriz olmadığından etkisi sınırlı kalabilir.`;
}

export class EconomicReportRepository {
  constructor(private readonly datasource: IEconomicCalendarDatasource = new RemoteEconomicCalendarDatasource()) {}

  getReport(id: string): Promise<EconomicEventReport> {
    return this.datasource.fetchReport(id);
  }

  analyze(report: EconomicEventReport): ReportAnalysis {
    const { event, statement } = report;
    const surprise = surpriseMeaning(event);
    const meaning = [...(surprise ? [surprise] : []), ...(event.result ? dataMeaning(event) : [])];
    if (statement) {
      meaning.push(TONE_TEXT[event.country][statement.tone]);
      const votes = statement.votes;
      if (votes?.against) {
        const side = votes.dissent === 'raise' ? 'artırım' : votes.dissent === 'lower' ? 'indirim' : 'farklı bir karar';
        meaning.push(`Karar ${votes.for}–${votes.against} oyla alındı; ${votes.against} üye ${side} yönünde oy kullandı. Ayrışma, sonraki toplantılarda bu yönde adım ihtimaline işaret edebilir.`);
      } else if (votes) {
        meaning.push('Karar oy birliğiyle alındı.');
      }
    }
    return { headline: headlineOf(event), meaning };
  }

  /** Açıklama anındaki fiyattan 24 saat sonrasına (ya da şu ana) yüzde değişim; veri yoksa `null`. */
  reaction(points: CandlePoint[], eventAt: string, now = Date.now()): PriceReaction | null {
    const start = Date.parse(eventAt);
    const end = Math.min(start + REACTION_WINDOW_MS, now);
    const at = (t: number) => [...points].reverse().find((p) => p.t <= t);
    const before = at(start);
    const after = at(end);
    if (!before || !after || after.t <= before.t || !before.v) return null;
    return { change: (after.v / before.v - 1) * 100, hours: Math.round((end - start) / 3_600_000) };
  }
}

export const economicReportRepository = new EconomicReportRepository();
