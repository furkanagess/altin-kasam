/** Ekonomik takvim ucu; ayrıntılar `src/server/economicCalendarService.ts` içinde. */

import { getCalendar } from '@/src/server/economicCalendarService';

export async function GET(): Promise<Response> {
  const body = await getCalendar();
  if (!body) return Response.json({ error: 'unavailable' }, { status: 502 });
  return Response.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
