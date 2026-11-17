import type { AuthProviderId } from '@/src/core/constants/account';
import { AuthError } from '@/src/data/datasources/firebaseAuthDatasource';
import { Platform } from 'react-native';

/**
 * Google ve Apple'ın yerel giriş ekranlarından Firebase'e verilecek kimlik jetonunu alır.
 * Native modüller ilk kullanımda yüklenir: paket eklenmeden önce alınmış development build'de
 * ya da web'de yoklarsa ilgili buton gizlenir.
 */

/** Web istemci kimliği: Firebase Auth > Google sağlayıcısını açınca oluşan "Web client". */
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
/** iOS istemci kimliği (Google Cloud > Credentials > iOS OAuth client). */
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

export type ProviderCredential = {
  provider: AuthProviderId;
  idToken: string;
  rawNonce?: string;
  displayName?: string | null;
};

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
type AppleModule = typeof import('expo-apple-authentication');
type CryptoModule = typeof import('expo-crypto');

let google: GoogleModule | null | undefined;
let googleConfigured = false;
let apple: AppleModule | null | undefined;

function loadGoogle(): GoogleModule | null {
  if (google !== undefined) return google;
  if (Platform.OS === 'web' || !GOOGLE_WEB_CLIENT_ID || (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID)) {
    return (google = null);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    google = require('@react-native-google-signin/google-signin') as GoogleModule;
  } catch {
    google = null;
  }
  return google;
}

function loadApple(): AppleModule | null {
  if (apple !== undefined) return apple;
  if (Platform.OS !== 'ios') return (apple = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    apple = require('expo-apple-authentication') as AppleModule;
  } catch {
    apple = null;
  }
  return apple;
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export const socialSignInDatasource = {
  isGoogleAvailable(): boolean {
    return loadGoogle() !== null;
  },

  /** Apple ile giriş yalnızca iOS'ta (Apple'ın yerel ekranı) sunulur. */
  async isAppleAvailable(): Promise<boolean> {
    const module = loadApple();
    if (!module) return false;
    try {
      return await module.isAvailableAsync();
    } catch {
      return false;
    }
  },

  /** Kullanıcı vazgeçerse `null`. */
  async google(): Promise<ProviderCredential | null> {
    const module = loadGoogle();
    if (!module) throw new AuthError('not_configured', 'Google ile bağlama bu sürümde kullanılamıyor.');
    const { GoogleSignin, statusCodes } = module;
    if (!googleConfigured) {
      GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID });
      googleConfigured = true;
    }
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Hesap seçici her seferinde açılsın; önceki oturum farklı bir Google hesabı olabilir.
      await GoogleSignin.signOut().catch(() => null);
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success') return null;
      const idToken = response.data.idToken;
      if (!idToken) throw new AuthError('no_token', 'Google kimlik bilgisi alınamadı, tekrar dene.');
      return { provider: 'google', idToken, displayName: response.data.user.name };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (hasCode(error, statusCodes.SIGN_IN_CANCELLED)) return null;
      if (hasCode(error, statusCodes.IN_PROGRESS)) return null;
      if (hasCode(error, statusCodes.PLAY_SERVICES_NOT_AVAILABLE)) {
        throw new AuthError('play_services', 'Google Play Hizmetleri bu cihazda kullanılamıyor.');
      }
      throw new AuthError('google_failed', 'Google ile giriş yapılamadı, tekrar dene.');
    }
  },

  /** Kullanıcı vazgeçerse `null`. Firebase nonce doğrulaması için ham nonce da döner. */
  async apple(): Promise<ProviderCredential | null> {
    const module = loadApple();
    if (!module) throw new AuthError('not_configured', 'Apple ile bağlama yalnızca iPhone’da kullanılabilir.');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Crypto = require('expo-crypto') as CryptoModule;
    const rawNonce = Crypto.randomUUID();
    // Apple'a SHA-256 (hex) özeti verilir, Firebase'e ham değer; ikisi eşleşmezse giriş reddedilir.
    const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    try {
      const credential = await module.signInAsync({
        nonce: hashedNonce,
        requestedScopes: [
          module.AppleAuthenticationScope.FULL_NAME,
          module.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new AuthError('no_token', 'Apple kimlik bilgisi alınamadı, tekrar dene.');
      const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
      return { provider: 'apple', idToken: credential.identityToken, rawNonce, displayName: name || null };
    } catch (error) {
      if (error instanceof AuthError) throw error;
      if (hasCode(error, 'ERR_REQUEST_CANCELED')) return null;
      throw new AuthError('apple_failed', 'Apple ile giriş yapılamadı, tekrar dene.');
    }
  },

  async signOutGoogle(): Promise<void> {
    await loadGoogle()?.GoogleSignin.signOut().catch(() => null);
  },
};
