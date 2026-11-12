import { Platform } from 'react-native';

const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Native'de `/api/...` isteklerinin gideceği sunucu (ör. https://altin-kasam.expo.app). Boşsa
 * göreli adres olduğu gibi kalır: geliştirmede Metro'ya, üretimde EAS'in bağladığı adrese gider.
 * Web'de sayfa aynı sunucudan geldiği için kullanılmaz.
 */
const API_ORIGIN = Platform.OS === 'web' ? '' : (process.env.EXPO_PUBLIC_API_ORIGIN ?? '').replace(/\/+$/, '');

const resolve = (url: string) => (API_ORIGIN && url.startsWith('/') ? `${API_ORIGIN}${url}` : url);

/** Zaman aşımı gövde okunurken de geçerlidir. */
async function request<T>(
  url: string,
  timeoutMs: number,
  read: (res: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(resolve(url), { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await read(res);
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchJson<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  return request(url, timeoutMs, (res) => res.json() as Promise<T>);
}

export function fetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  return request(url, timeoutMs, (res) => res.text());
}
