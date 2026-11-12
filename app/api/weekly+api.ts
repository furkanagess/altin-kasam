/**
 * Haftalık analizlerin yedek kaynağı: `EXPO_PUBLIC_WEEKLY_ANALYSIS_URL` (Firebase Hosting) tanımlı
 * değilse uygulama bu uçtan repodaki dosyayı okur. Dosya sunucu paketine derlenir; burada
 * değişiklik ancak sunucu yeniden yayımlanınca (`eas deploy`) görünür, Firebase'de ise hemen.
 */

import analyses from '@/firebase/public/weekly-analyses.json';

export function GET(): Response {
  return Response.json(analyses, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
