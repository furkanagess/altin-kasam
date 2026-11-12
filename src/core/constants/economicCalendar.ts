import type { EconomicEvent, EconomicEventExpectation, EconomicEventKind } from '@/src/domain/models';

/** Hatırlatma bildirimi açıklamadan bu kadar önce gelir. */
export const EVENT_REMINDER_LEAD_MINUTES = 15;


/** Açıklanan değerin beklentiye göre konumu; model tahmininde "tahmin" denir. */
export function surpriseLabel(e: EconomicEventExpectation): string | null {
  if (!e.surprise) return null;
  const nowcast = e.kind === 'nowcast';
  if (e.surprise === 'inline') return nowcast ? 'tahminle uyumlu' : 'beklentiyle uyumlu';
  const side = e.surprise === 'above' ? 'üstünde' : 'altında';
  return `${nowcast ? 'tahminin' : 'beklentinin'} ${side}`;
}

export const EVENT_COUNTRY_LABELS: Record<EconomicEvent['country'], string> = {
  US: 'ABD',
  TR: 'TR',
};

/** Olay türüne göre altın ve gümüşe olası etkisi; takvim ekranında gösterilir. */
export const EVENT_IMPACT_NOTES: Record<EconomicEvent['country'], Record<EconomicEventKind, string>> = {
  US: {
    rate: 'Faiz indirimi ya da güvercin mesaj getirisi olmayan altını destekler; şahin mesaj doları ve reel faizi artırarak onsa baskı yapar.',
    inflation:
      'Beklentinin üstünde enflasyon faiz indirimi beklentisini zayıflatıp onsa baskı yapabilir; altında gelen veri genellikle destekler.',
    jobs: 'Güçlü istihdam doları ve faiz beklentisini destekleyip onsa baskı yapabilir; zayıf veri altını destekler.',
  },
  TR: {
    rate: 'Faiz kararı TL’yi etkiler; beklenenden sert indirim dolar/TL ile birlikte gram altını yukarı itebilir.',
    inflation: 'Yüksek enflasyon değer koruma amaçlı altın talebini artırır ve TCMB’nin faiz beklentisini değiştirir.',
    jobs: 'İstihdam verisi büyüme ve faiz beklentisi üzerinden TL’yi etkiler.',
  },
};

export type EventScenarioSide = 'above' | 'inline' | 'below';

export type EventScenario = {
  side: EventScenarioSide;
  /** Sonucun beklentiye göre konumu, olay türüne uygun dille. */
  condition: string;
  /** Altın ve gümüş için olası yön; kesin tahmin değil. */
  effect: string;
};

type ScenarioSet = Record<EventScenarioSide, { condition: string; effect: string }>;

/** Açıklamadan önce "ne beklenmeli": sonuç beklentinin üstünde / uyumlu / altında gelirse olası etki. */
export const EVENT_SCENARIOS: Record<EconomicEvent['country'], Record<EconomicEventKind, ScenarioSet>> = {
  US: {
    rate: {
      above: { condition: 'Beklentiden şahin karar', effect: 'Dolar ve reel faiz güçlenir, onsa baskı gelebilir.' },
      inline: { condition: 'Beklentiyle uyumlu karar', effect: 'Fiyatlanmış olur; tepki metin ve basın toplantısına bağlı kalır.' },
      below: { condition: 'Beklentiden güvercin karar', effect: 'Faiz indirimi beklentisi güçlenir, altın ve gümüş desteklenebilir.' },
    },
    inflation: {
      above: { condition: 'Enflasyon beklentinin üstünde', effect: 'Faiz indirimi beklentisi zayıflar, onsa baskı gelebilir.' },
      inline: { condition: 'Enflasyon beklentiyle uyumlu', effect: 'Sınırlı tepki beklenir; asıl hareket sonraki veriye kalabilir.' },
      below: { condition: 'Enflasyon beklentinin altında', effect: 'Faiz indirimi beklentisi güçlenir, altın desteklenebilir.' },
    },
    jobs: {
      above: { condition: 'İstihdam beklentinin üstünde', effect: 'Dolar ve faiz beklentisi güçlenir, onsa baskı gelebilir.' },
      inline: { condition: 'İstihdam beklentiyle uyumlu', effect: 'Sınırlı tepki beklenir.' },
      below: { condition: 'İstihdam beklentinin altında', effect: 'Faiz indirimi beklentisi güçlenir, altın desteklenebilir.' },
    },
  },
  TR: {
    rate: {
      above: { condition: 'Beklenenden az indirim ya da sıkı duruş', effect: 'TL desteklenir, gram altında yükseliş sınırlı kalabilir.' },
      inline: { condition: 'Beklentiyle uyumlu karar', effect: 'Fiyatlanmış olur; tepki karar metnindeki ipuçlarına bağlı kalır.' },
      below: { condition: 'Beklenenden sert indirim', effect: 'TL zayıflarsa dolar/TL ile birlikte gram altın yukarı gidebilir.' },
    },
    inflation: {
      above: { condition: 'Enflasyon beklentinin üstünde', effect: 'Değer koruma talebi artabilir; faiz indirimi beklentisi gecikebilir.' },
      inline: { condition: 'Enflasyon beklentiyle uyumlu', effect: 'Sınırlı tepki beklenir.' },
      below: { condition: 'Enflasyon beklentinin altında', effect: 'Değer koruma talebi zayıflayabilir; faiz indirimi beklentisi güçlenir.' },
    },
    jobs: {
      above: { condition: 'İstihdam beklentinin üstünde', effect: 'Büyüme algısı güçlenir; altına etkisi dolaylı ve sınırlıdır.' },
      inline: { condition: 'İstihdam beklentiyle uyumlu', effect: 'Sınırlı tepki beklenir.' },
      below: { condition: 'İstihdam beklentinin altında', effect: 'Faiz indirimi beklentisi güçlenebilir; altına etkisi dolaylıdır.' },
    },
  },
};

export const EVENT_SCENARIO_DISCLAIMER =
  'Bilgilendirme amaçlıdır, yatırım tavsiyesi değildir. Fiyat hareketi yalnızca bu açıklamaya bağlı olmayabilir.';

const SIDES: EventScenarioSide[] = ['above', 'inline', 'below'];

export function eventScenarios(event: Pick<EconomicEvent, 'country' | 'kind'>): EventScenario[] {
  const set = EVENT_SCENARIOS[event.country][event.kind];
  return SIDES.map((side) => ({ side, ...set[side] }));
}

/** Beklenti satırı, örn. "Beklenti: Yıllık %35,00"; beklenti yoksa null. */
export function eventExpectationLine(event: Pick<EconomicEvent, 'expectation'>): string | null {
  const e = event.expectation;
  if (!e) return null;
  const label = e.kind === 'nowcast' ? 'Tahmin' : 'Beklenti';
  return `${label}: ${e.basis ? `${e.basis} ` : ''}${e.value}`;
}

/** Hatırlatma bildiriminin gövdesi: zamanlama, beklenti ve iki uç senaryo tek kısa metinde. */
export function eventReminderBody(event: EconomicEvent, leadMinutes = EVENT_REMINDER_LEAD_MINUTES): string {
  const set = EVENT_SCENARIOS[event.country][event.kind];
  const head = [`${leadMinutes} dakika sonra açıklanacak`, event.period, eventExpectationLine(event)]
    .filter(Boolean)
    .join(' · ');
  return `${head}\nÜstünde: ${set.above.effect}\nAltında: ${set.below.effect}`;
}
