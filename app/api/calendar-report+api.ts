/** Açıklanmış olay raporu: `/api/calendar-report?id=tr-ppk-2026-10`. Ayrıntılar `src/server/economicReport.ts`. */

import { getReport } from '@/src/server/economicReport';

export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[a-z]{2}-[a-z]+-\d{4}-\d{2}$/.test(id)) return Response.json({ error: 'bad_request' }, { status: 400 });
  const report = await getReport(id);
  if (!report) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json(report, { headers: { 'Cache-Control': 'no-store' } });
}
