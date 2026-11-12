import type { EconomicEvent } from '@/src/domain/models';

/** Para politikası metninin yönü: sıkı (şahin), gevşek (güvercin) ya da dengeli. */
export type StatementTone = 'hawkish' | 'dovish' | 'balanced';

/** `/api/calendar-report` yanıtı: açıklanmış olay, resmî kaynak ve varsa karar metninden çıkarımlar. */
export type EconomicEventReport = {
  event: EconomicEvent;
  source: { label: string; url: string };
  /** Fed ve TCMB kararlarında resmî metin; veri açıklamalarında (TÜFE, istihdam) yok. */
  statement?: {
    language: 'tr' | 'en';
    paragraphs: string[];
    tone: StatementTone;
    /** Tonu belirleyen ifadeler, Türkçe açıklamayla. */
    toneReasons: string[];
    votes?: { for: number; against: number; dissent?: 'raise' | 'lower' };
  };
};
