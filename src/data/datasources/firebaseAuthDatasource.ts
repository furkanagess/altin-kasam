import type { AuthProviderId } from '@/src/core/constants/account';
import { Platform } from 'react-native';

/**
 * Firebase Authentication, REST uçlarıyla (Identity Toolkit + Secure Token). JS SDK'nın React Native
 * kalıcılık ve Metro sorunlarına girmeden aynı Firebase kullanıcısını (uid) üretir. Oturum
 * (yenileme anahtarı) cihazın güvenli deposunda (Keychain/Keystore) tutulur.
 *
 * `EXPO_PUBLIC_FIREBASE_API_KEY` Firebase'in istemciye gömülmek üzere tasarlanmış web API anahtarıdır.
 */
const API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const SESSION_KEY = 'altin_kasam_auth_session_v1';
const TIMEOUT_MS = 15_000;
/** Kimlik jetonu süresi dolmadan bu kadar önce yenilenir. */
const REFRESH_MARGIN_MS = 5 * 60_000;

export type AuthSession = {
  uid: string;
  provider: AuthProviderId;
  email: string | null;
  displayName: string | null;
  idToken: string;
  refreshToken: string;
  /** ms cinsinden epoch. */
  expiresAt: number;
};

type SecureStoreModule = typeof import('expo-secure-store');
let secureStore: SecureStoreModule | null | undefined;

/** Web'de ve modülsüz (eski) development build'de yok; o zaman hesap bağlama kapalıdır. */
function store(): SecureStoreModule | null {
  if (secureStore !== undefined) return secureStore;
  if (Platform.OS === 'web') return (secureStore = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    secureStore = require('expo-secure-store') as SecureStoreModule;
  } catch {
    secureStore = null;
  }
  return secureStore;
}

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const FIREBASE_MESSAGES: Record<string, string> = {
  OPERATION_NOT_ALLOWED: 'Bu giriş yöntemi Firebase’de etkin değil.',
  INVALID_IDP_RESPONSE: 'Giriş sağlayıcısından gelen yanıt doğrulanamadı.',
  USER_DISABLED: 'Bu hesap devre dışı bırakılmış.',
  TOKEN_EXPIRED: 'Oturumun süresi doldu, hesabını yeniden bağla.',
  USER_NOT_FOUND: 'Hesap bulunamadı, yeniden bağla.',
  INVALID_REFRESH_TOKEN: 'Oturumun süresi doldu, hesabını yeniden bağla.',
  MISSING_OR_INVALID_NONCE: 'Apple girişi doğrulanamadı, tekrar dene.',
};

async function post<T>(url: string, body: string, contentType: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) {
      const raw = json.error?.message ?? `HTTP_${res.status}`;
      const code = raw.split(/[\s:]/)[0];
      throw new AuthError(code, FIREBASE_MESSAGES[code] ?? 'Hesap bağlanamadı, tekrar dene.');
    }
    return json;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('network', 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.');
  } finally {
    clearTimeout(timeout);
  }
}

type IdpResponse = {
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  email?: string;
  displayName?: string;
  fullName?: string;
};

type RefreshResponse = {
  id_token: string;
  refresh_token: string;
  expires_in: string;
  user_id: string;
};

async function save(session: AuthSession | null) {
  const s = store();
  if (!s) return;
  if (session) await s.setItemAsync(SESSION_KEY, JSON.stringify(session));
  else await s.deleteItemAsync(SESSION_KEY);
}

export const firebaseAuthDatasource = {
  isConfigured(): boolean {
    return Boolean(API_KEY) && store() !== null;
  },

  async loadSession(): Promise<AuthSession | null> {
    const s = store();
    if (!s) return null;
    try {
      const raw = await s.getItemAsync(SESSION_KEY);
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  },

  /**
   * Sağlayıcıdan alınan kimlik jetonuyla Firebase'e giriş yapar; aynı Google/Apple hesabı her
   * cihazda aynı `uid`'yi verir. Apple için ham nonce zorunludur.
   */
  async signInWithIdToken(
    provider: AuthProviderId,
    idToken: string,
    options: { rawNonce?: string; displayName?: string | null } = {},
  ): Promise<AuthSession> {
    if (!API_KEY) throw new AuthError('not_configured', 'Hesap bağlama bu sürümde kullanılamıyor.');
    const params = new URLSearchParams({
      id_token: idToken,
      providerId: provider === 'google' ? 'google.com' : 'apple.com',
    });
    if (options.rawNonce) params.set('nonce', options.rawNonce);
    const res = await post<IdpResponse>(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${API_KEY}`,
      JSON.stringify({
        requestUri: 'http://localhost',
        postBody: params.toString(),
        returnSecureToken: true,
        returnIdpCredential: true,
      }),
      'application/json',
    );
    const session: AuthSession = {
      uid: res.localId,
      provider,
      email: res.email ?? null,
      // Apple adı yalnızca ilk girişte verir; Firebase de saklamadıysa istemcinin aldığı ad kullanılır.
      displayName: res.displayName ?? res.fullName ?? options.displayName ?? null,
      idToken: res.idToken,
      refreshToken: res.refreshToken,
      expiresAt: Date.now() + Number(res.expiresIn) * 1000,
    };
    await save(session);
    return session;
  },

  /** Geçerli kimlik jetonu; süresi dolmak üzereyse yenileyip oturumu günceller. */
  async freshToken(session: AuthSession): Promise<AuthSession> {
    if (session.expiresAt - REFRESH_MARGIN_MS > Date.now()) return session;
    if (!API_KEY) throw new AuthError('not_configured', 'Hesap bağlama bu sürümde kullanılamıyor.');
    const res = await post<RefreshResponse>(
      `https://securetoken.googleapis.com/v1/token?key=${API_KEY}`,
      new URLSearchParams({ grant_type: 'refresh_token', refresh_token: session.refreshToken }).toString(),
      'application/x-www-form-urlencoded',
    );
    const next: AuthSession = {
      ...session,
      uid: res.user_id,
      idToken: res.id_token,
      refreshToken: res.refresh_token,
      expiresAt: Date.now() + Number(res.expires_in) * 1000,
    };
    await save(next);
    return next;
  },

  async clearSession(): Promise<void> {
    await save(null).catch(() => {});
  },
};
