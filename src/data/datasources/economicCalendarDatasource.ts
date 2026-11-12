import { fetchJson } from '@/src/data/datasources/http';
import type { EconomicEventReport } from '@/src/data/datasources/economicReportTypes';
import type { EconomicEvent } from '@/src/domain/models';

/** Uygulamanın kendi sunucu ucu; geliştirmede Metro'ya, üretimde `expo-router` `origin` adresine gider. */
const ENDPOINT = '/api/calendar';
const REPORT_ENDPOINT = '/api/calendar-report';
const TIMEOUT_MS = 20_000;

export type EconomicCalendarResponse = { events: EconomicEvent[]; generatedAt: string };

export interface IEconomicCalendarDatasource {
  fetchEvents(): Promise<EconomicEvent[]>;
  /** Açıklanmış olayın raporu; bulunamazsa hata fırlatır. */
  fetchReport(id: string): Promise<EconomicEventReport>;
}

/** Resmî kurum takvimlerinden sunucuda derlenen olaylar; uca ulaşılamazsa hata fırlatır. */
export class RemoteEconomicCalendarDatasource implements IEconomicCalendarDatasource {
  async fetchEvents(): Promise<EconomicEvent[]> {
    const response = await fetchJson<EconomicCalendarResponse>(ENDPOINT, TIMEOUT_MS);
    if (!Array.isArray(response.events)) throw new Error('Takvim yanıtı geçersiz');
    return response.events;
  }

  fetchReport(id: string): Promise<EconomicEventReport> {
    return fetchJson<EconomicEventReport>(`${REPORT_ENDPOINT}?id=${encodeURIComponent(id)}`, TIMEOUT_MS);
  }
}
