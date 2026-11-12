/**
 * Sunucu tarafı alarm kontrolü için fiyat ucu (Cloud Functions çağırır). Yalnızca alarm kimlikleri ve
 * sayılar döner; `ALARM_SERVER_SECRET` ile korunur. Hasfiyat önbelleği `/api/prices` ile ortaktır.
 */

import { NO_STORE_HEADERS } from '@/src/core/constants/hasfiyatCache';
import { alarmValuesFromItems } from '@/src/core/constants/hasfiyatPriceMap';
import { loadPrices } from '@/src/server/hasfiyatPrices';

export async function GET(request: Request): Promise<Response> {
  // Değerlerdeki baştaki/sondaki boşluk ve satır sonu (kopyalama artığı) eşleşmeyi bozmasın.
  const secret = process.env.ALARM_SERVER_SECRET?.trim();
  // Anahtar sunucuya hiç ulaşmadıysa 503: yanlış anahtarla (401) karışmasın.
  if (!secret) return Response.json({ error: 'not_configured' }, { status: 503, headers: NO_STORE_HEADERS });
  if (request.headers.get('x-alarm-secret')?.trim() !== secret) {
    return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
  }
  const result = await loadPrices();
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status, headers: NO_STORE_HEADERS });
  return Response.json(
    { lastUpdate: result.body.lastUpdate, stale: result.body.stale, values: alarmValuesFromItems(result.body.items) },
    { headers: NO_STORE_HEADERS },
  );
}
