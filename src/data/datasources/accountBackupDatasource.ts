/**
 * Firebase `account` fonksiyonu: bağlı hesabın verisini (Firestore `users/{uid}`) okur, yazar ve
 * hesabı siler. İstemci Firestore'a doğrudan erişmez; her istek Firebase kimlik jetonuyla doğrulanır.
 */
const ACCOUNT_URL = process.env.EXPO_PUBLIC_ACCOUNT_API_URL;
const TIMEOUT_MS = 15_000;

export type AccountSnapshot = {
  /** Anahtar → AsyncStorage'daki ham JSON metni. */
  data: Record<string, string>;
  updatedAt: string;
};

async function call<T>(method: 'GET' | 'PUT' | 'DELETE', idToken: string, body?: unknown): Promise<T> {
  if (!ACCOUNT_URL) throw new Error('Hesap sunucusu tanımlı değil.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ACCOUNT_URL, {
      method,
      headers: {
        Authorization: `Bearer ${idToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Hesap sunucusu yanıt vermedi (${res.status}).`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const accountBackupDatasource = {
  isConfigured(): boolean {
    return Boolean(ACCOUNT_URL);
  },

  /** Hesapta hiç yedek yoksa `null`. */
  async fetch(idToken: string): Promise<AccountSnapshot | null> {
    const res = await call<{ snapshot: AccountSnapshot | null }>('GET', idToken);
    return res.snapshot ?? null;
  },

  async upload(idToken: string, data: Record<string, string>): Promise<AccountSnapshot> {
    const res = await call<{ snapshot: AccountSnapshot }>('PUT', idToken, { data });
    return res.snapshot;
  },

  /** Hesabı (Firebase kullanıcısı) ve sunucudaki tüm verisini kalıcı olarak siler. */
  async deleteAccount(idToken: string): Promise<void> {
    await call<{ ok: true }>('DELETE', idToken);
  },
};
