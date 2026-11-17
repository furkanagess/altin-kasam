import { networkMonitor } from '@/src/core/network/networkMonitor';

const OFFLINE_MESSAGE = 'İnternet bağlantın yok. Bağlantı gelince veriler kendiliğinden yenilenecek.';

/**
 * Ağ isteklerinin tipli hataları. Mesaj, eski kodun metin eşlemesi (`Network request failed`,
 * `HTTP 503`) bozulmasın diye teknik haliyle tutulur; kullanıcıya `userMessageForError` gösterilir.
 */
export type NetworkErrorKind =
  /** Cihaz çevrimdışı; istek hiç gönderilmedi. */
  | 'offline'
  /** Sunucu süre içinde yanıt vermedi (genelde zayıf bağlantı). */
  | 'timeout'
  /** Bağlantı kurulamadı (DNS, kopma, captive portal...). */
  | 'network'
  /** Sunucu yanıt verdi ama başarısız durum kodu döndü. */
  | 'http';

export class NetworkError extends Error {
  readonly kind: NetworkErrorKind;
  readonly status?: number;

  constructor(kind: NetworkErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'NetworkError';
    this.kind = kind;
    this.status = status;
  }
}

export function isNetworkError(e: unknown): e is NetworkError {
  return e instanceof NetworkError;
}

/** Bağlantıdan kaynaklanan (sunucu yanıtı olmayan) hata mı? */
export function isConnectivityError(e: unknown): boolean {
  return isNetworkError(e) && e.kind !== 'http';
}

/**
 * Teknik hatayı kullanıcının anlayacağı, ne yapacağını söyleyen bir cümleye çevirir. Birden çok
 * kaynağı birleştiren katmanların kendi hataları da cihaz çevrimdışıysa bağlantı mesajına döner.
 */
export function userMessageForError(e: unknown, fallback: string): string {
  if (networkMonitor.isOffline()) return OFFLINE_MESSAGE;
  if (!isNetworkError(e)) return fallback;
  switch (e.kind) {
    case 'offline':
      return OFFLINE_MESSAGE;
    case 'timeout':
      return 'Bağlantı çok yavaş, sunucu zamanında yanıt vermedi. Biraz sonra tekrar dene.';
    case 'network':
      return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.';
    case 'http':
      if (e.status && e.status >= 500) return 'Sunucu şu an yanıt vermiyor. Biraz sonra tekrar dene.';
      if (e.status === 429) return 'Çok sık istek gönderildi. Birkaç saniye sonra tekrar dene.';
      return fallback;
  }
}
