/**
 * Web reklamları (Google AdSense). Yayıncı kimliği herkese açıktır (`ads.txt` ve sayfa kaynağında
 * görünür); gizli değildir. Mobil uygulamadaki reklamlar AdMob ile ayrıca yapılır.
 */
export const ADSENSE_CLIENT = 'ca-pub-3499593115543692';

/**
 * Sayfa reklam alanı → AdSense reklam birimi (slot) numarası. Numara girilmemiş alan boş kalır
 * (yalnızca yer ayırır) ve AdSense betiği o sayfada hiç yüklenmez. Numaralar AdSense →
 * Reklamlar → Reklam birimine göre → Görüntülü reklam bölümünden alınır.
 */
export const ADSENSE_SLOTS: Record<string, string | undefined> = {
  'market-right': undefined,
  'analytics-right': undefined,
  'community-right': undefined,
  'portfolio-right': undefined,
  'calendar-right': undefined,
  'settings-right': undefined,
};
