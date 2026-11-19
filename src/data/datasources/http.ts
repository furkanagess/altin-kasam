import { NetworkError, isNetworkError } from '@/src/core/network/networkErrors';
import { networkMonitor, type RequestOutcome } from '@/src/core/network/networkMonitor';
import { Platform } from 'react-native';

const DEFAULT_TIMEOUT_MS = 10_000;
/** Bağlantı hatası ya da zaman aşımında varsayılan ek deneme sayısı. */
const DEFAULT_RETRIES = 1;
/** Denemeler arası bekleme: 700 ms, 1.4 s... (+ rastgele kayma; herkes aynı anda vurmasın). */
const RETRY_BASE_MS = 700;
const RETRY_JITTER_MS = 300;
/** Bundan uzun süreli isteklerde zaman aşımı tekrar denenmez; kullanıcıyı iki kat bekletmez. */
const MAX_RETRY_TIMEOUT_MS = 12_000;
/** Bağlantı zayıfken süre uzatılır; yavaş ama çalışan ağda istekler boşuna düşmesin. */
const WEAK_TIMEOUT_FACTOR = 1.6;
/**
 * Geçici sunucu hataları; yeniden denemeye değer. 500 ve 503 de dahil: barındırma platformu yeni
 * yayından hemen sonra ya da anlık yükte bunları döndürebiliyor ve tek başarısız istek grafiği
 * sayfa yenilenene kadar boş bırakıyordu.
 */
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

/**
 * Native'de `/api/...` isteklerinin gideceği sunucu (ör. https://altin-kasam.expo.app). Boşsa
 * göreli adres olduğu gibi kalır: geliştirmede Metro'ya, üretimde EAS'in bağladığı adrese gider.
 * Web'de sayfa aynı sunucudan geldiği için kullanılmaz.
 */
const API_ORIGIN = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_ORIGIN ?? '').replace(/\/+$/, '');

const resolve = (url: string) => (API_ORIGIN && url.startsWith('/') ? `${API_ORIGIN}${url}` : url);

export type RequestOptions = {
  timeoutMs?: number;
  /** Bağlantı hatası / zaman aşımında ek deneme sayısı. */
  retries?: number;
};

const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

/**
 * Bağlantı kalitesine yalnızca kendi sunucumuza (`/api/...`) giden istekler sayılır. Üçüncü taraf
 * kaynakların (RSS, Bluesky) kendi kesintileri ya da web'deki CORS hataları yanlış alarm üretmesin.
 */
function report(url: string, outcome: RequestOutcome, startedAt: number) {
  if (url.startsWith('/')) networkMonitor.record(outcome, Date.now() - startedAt);
}

/** Tek deneme. Zaman aşımı gövde okunurken de geçerlidir. */
async function attempt<T>(url: string, timeoutMs: number, read: (res: Response) => Promise<T>): Promise<T> {
  // Cihaz çevrimdışıyken istek hiç gönderilmez: kullanıcı 10 sn zaman aşımı beklemez, pil harcanmaz.
  if (networkMonitor.isOffline()) {
    throw new NetworkError('offline', `Network request failed (offline): ${url}`);
  }
  const effectiveTimeout = networkMonitor.isWeak() ? Math.round(timeoutMs * WEAK_TIMEOUT_FACTOR) : timeoutMs;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeout);
  const startedAt = Date.now();
  try {
    let res: Response;
    try {
      res = await fetch(resolve(url), { signal: controller.signal });
    } catch (e) {
      if (controller.signal.aborted) {
        report(url, 'timeout', startedAt);
        throw new NetworkError('timeout', `Request timed out after ${effectiveTimeout}ms: ${url}`);
      }
      report(url, 'network', startedAt);
      const reason = e instanceof Error ? e.message : String(e);
      throw new NetworkError('network', `${reason}: ${url}`);
    }
    if (!res.ok) {
      // Sunucu yanıt verdi; bağlantı açısından sorun yok.
      report(url, 'ok', startedAt);
      throw new NetworkError('http', `HTTP ${res.status}: ${url}`, res.status);
    }
    try {
      const body = await read(res);
      report(url, 'ok', startedAt);
      return body;
    } catch (e) {
      if (controller.signal.aborted) {
        report(url, 'timeout', startedAt);
        throw new NetworkError('timeout', `Response timed out after ${effectiveTimeout}ms: ${url}`);
      }
      throw e;
    }
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryable(e: unknown, timeoutMs: number): boolean {
  if (!isNetworkError(e)) return false;
  switch (e.kind) {
    case 'network':
      return true;
    case 'timeout':
      return timeoutMs <= MAX_RETRY_TIMEOUT_MS;
    case 'http':
      return e.status !== undefined && RETRYABLE_STATUS.has(e.status);
    case 'offline':
      return false;
  }
}

async function request<T>(
  url: string,
  options: number | RequestOptions | undefined,
  read: (res: Response) => Promise<T>,
): Promise<T> {
  const opts = typeof options === 'number' ? { timeoutMs: options } : (options ?? {});
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = opts.retries ?? DEFAULT_RETRIES;
  for (let n = 0; ; n++) {
    try {
      return await attempt(url, timeoutMs, read);
    } catch (e) {
      if (n >= retries || !isRetryable(e, timeoutMs)) throw e;
      await sleep(RETRY_BASE_MS * 2 ** n + Math.random() * RETRY_JITTER_MS);
    }
  }
}

export function fetchJson<T>(url: string, options?: number | RequestOptions): Promise<T> {
  return request(url, options, (res) => res.json() as Promise<T>);
}

export function fetchText(url: string, options?: number | RequestOptions): Promise<string> {
  return request(url, options, (res) => res.text());
}
