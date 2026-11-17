import { ACCOUNT_SYNC_KEYS, type AuthProviderId } from '@/src/core/constants/account';
import { storageGet, storageGetRaw, storageSet, storageSetRaw } from '@/src/core/storage/storage';
import { accountBackupDatasource } from '@/src/data/datasources/accountBackupDatasource';
import {
  AuthError,
  firebaseAuthDatasource,
  type AuthSession,
} from '@/src/data/datasources/firebaseAuthDatasource';
import { socialSignInDatasource } from '@/src/data/datasources/socialSignInDatasource';
import { subscriptionRepository } from '@/src/data/repositories/subscriptionRepository';

/** Son eşitlemenin zamanı ve o andan beri yerelde değişiklik olup olmadığı (cihaza özgü). */
const SYNC_META_KEY = 'altin_kasam_account_sync_v1';
type SyncMeta = { lastSyncedAt: string | null; dirty: boolean };

export type Account = Pick<AuthSession, 'uid' | 'provider' | 'email' | 'displayName'>;

export type LinkResult = {
  account: Account;
  /** Hesapta önceden veri vardı ve bu cihazdakilerle birleştirilip cihaza yazıldı. */
  restored: boolean;
};

const toAccount = ({ uid, provider, email, displayName }: AuthSession): Account => ({
  uid,
  provider,
  email,
  displayName,
});

function parse(raw: string | undefined): unknown {
  if (raw === undefined) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Liste öğesinin kimliği: kayıtlarda `id`, takip edilen kaynakta `name`, düz listelerde değerin kendisi. */
function identity(item: unknown): string {
  if (item && typeof item === 'object') {
    const o = item as { id?: unknown; name?: unknown };
    if (typeof o.id === 'string') return `id:${o.id}`;
    if (typeof o.name === 'string') return `name:${o.name}`;
  }
  return `v:${JSON.stringify(item)}`;
}

/**
 * Bir anahtarın cihazdaki ve hesaptaki değerini birleştirir; hiçbir kayıt kaybolmaz:
 * listeler kimliğe göre birleşir (cihazdaki kopya önceliklidir), sayaçlarda büyük olan,
 * evet/hayır değerlerinde "evet" kalır, diğerlerinde cihazdaki değer (yoksa hesaptaki) kullanılır.
 */
function mergeValue(local: unknown, remote: unknown): unknown {
  if (local === undefined || local === null) return remote;
  if (remote === undefined || remote === null) return local;
  if (Array.isArray(local) && Array.isArray(remote)) {
    const seen = new Set(local.map(identity));
    return [...local, ...remote.filter((item) => !seen.has(identity(item)))];
  }
  if (typeof local === 'boolean' && typeof remote === 'boolean') return local || remote;
  if (
    typeof local === 'object' &&
    typeof remote === 'object' &&
    Object.values(local as object).every((v) => typeof v === 'number') &&
    Object.values(remote as object).every((v) => typeof v === 'number')
  ) {
    const out: Record<string, number> = { ...(remote as Record<string, number>) };
    for (const [k, v] of Object.entries(local as Record<string, number>)) out[k] = Math.max(v, out[k] ?? 0);
    return out;
  }
  return local;
}

export function mergeSnapshots(
  local: Record<string, string>,
  remote: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of ACCOUNT_SYNC_KEYS) {
    const merged = mergeValue(parse(local[key]), parse(remote[key]));
    if (merged !== undefined) out[key] = JSON.stringify(merged);
  }
  return out;
}

async function readMeta(): Promise<SyncMeta> {
  return (await storageGet<SyncMeta>(SYNC_META_KEY)) ?? { lastSyncedAt: null, dirty: false };
}

async function writeMeta(meta: SyncMeta) {
  await storageSet(SYNC_META_KEY, meta);
}

export class AccountRepository {
  private session: AuthSession | null = null;

  /** API anahtarı, hesap sunucusu ve güvenli depo varsa hesap bağlama sunulur. */
  get configured(): boolean {
    return firebaseAuthDatasource.isConfigured() && accountBackupDatasource.isConfigured();
  }

  /** Bu oturumda bağlı hesap var mı. */
  get linked(): boolean {
    return this.session !== null;
  }

  isGoogleAvailable(): boolean {
    return this.configured && socialSignInDatasource.isGoogleAvailable();
  }

  async isAppleAvailable(): Promise<boolean> {
    return this.configured && (await socialSignInDatasource.isAppleAvailable());
  }

  async restoreSession(): Promise<Account | null> {
    if (!this.configured) return null;
    this.session = await firebaseAuthDatasource.loadSession();
    return this.session ? toAccount(this.session) : null;
  }

  private async token(): Promise<string> {
    if (!this.session) throw new AuthError('signed_out', 'Bağlı hesap yok.');
    try {
      this.session = await firebaseAuthDatasource.freshToken(this.session);
    } catch (error) {
      // Yenileme anahtarı geçersizse (hesap silinmiş/devre dışı) oturum kapatılır.
      if (error instanceof AuthError && error.code !== 'network') await this.signOut();
      throw error;
    }
    return this.session.idToken;
  }

  /**
   * Google/Apple ile giriş yapar ve bu cihazdaki tüm veriyi hesaba taşır. Hesapta başka bir cihazdan
   * gelen veri varsa ikisi birleştirilip hem cihaza hem hesaba yazılır. Vazgeçilirse `null`.
   */
  async link(provider: AuthProviderId): Promise<LinkResult | null> {
    const credential =
      provider === 'google' ? await socialSignInDatasource.google() : await socialSignInDatasource.apple();
    if (!credential) return null;
    this.session = await firebaseAuthDatasource.signInWithIdToken(provider, credential.idToken, {
      rawNonce: credential.rawNonce,
      displayName: credential.displayName,
    });
    try {
      // Abonelik hesaba bağlanır: bu cihazdaki satın alım hesaba geçer, hesaptaki Pro bu cihazda açılır.
      await subscriptionRepository.identify(this.session.uid).catch(() => false);

      const token = await this.token();
      const [local, remote] = await Promise.all([
        storageGetRaw(ACCOUNT_SYNC_KEYS),
        accountBackupDatasource.fetch(token),
      ]);
      const remoteData = remote?.data ?? {};
      const restored = Object.keys(remoteData).length > 0;
      const merged = restored ? mergeSnapshots(local, remoteData) : local;
      if (restored) await storageSetRaw(merged);
      const saved = await accountBackupDatasource.upload(token, merged);
      await writeMeta({ lastSyncedAt: saved.updatedAt, dirty: false });
      return { account: toAccount(this.session), restored };
    } catch (error) {
      // Veri taşınamadıysa yarım bağlantı bırakılmaz; kullanıcı tekrar deneyebilir.
      await this.signOut();
      throw error instanceof AuthError
        ? error
        : new AuthError('backup_failed', 'Verilerin hesaba aktarılamadı. İnternetini kontrol edip tekrar dene.');
    }
  }

  async markDirty(): Promise<void> {
    const meta = await readMeta();
    if (!meta.dirty) await writeMeta({ ...meta, dirty: true });
  }

  /** Cihazdaki güncel veriyi hesaba yazar (cihaz kazanır). */
  async push(): Promise<void> {
    if (!this.session) return;
    const token = await this.token();
    const saved = await accountBackupDatasource.upload(token, await storageGetRaw(ACCOUNT_SYNC_KEYS));
    await writeMeta({ lastSyncedAt: saved.updatedAt, dirty: false });
  }

  /**
   * Açılışta eşitleme: cihazda yüklenmemiş değişiklik varsa hesaba yazılır; yoksa ve hesap başka
   * cihazdan güncellenmişse hesaptaki veri cihaza alınır. Cihaza veri yazıldıysa `true`.
   */
  async pull(): Promise<boolean> {
    if (!this.session) return false;
    const meta = await readMeta();
    if (meta.dirty) {
      await this.push();
      return false;
    }
    const remote = await accountBackupDatasource.fetch(await this.token());
    if (!remote || (meta.lastSyncedAt && remote.updatedAt <= meta.lastSyncedAt)) return false;
    await storageSetRaw(remote.data);
    await writeMeta({ lastSyncedAt: remote.updatedAt, dirty: false });
    return true;
  }

  /** Bağlantıyı keser; veriler bu cihazda ve hesapta kalır. */
  async signOut(): Promise<void> {
    const provider = this.session?.provider;
    this.session = null;
    await firebaseAuthDatasource.clearSession();
    await writeMeta({ lastSyncedAt: null, dirty: false }).catch(() => {});
    if (provider === 'google') await socialSignInDatasource.signOutGoogle();
    await subscriptionRepository.reset().catch(() => {});
  }

  /** Hesabı ve hesaptaki tüm yedeği kalıcı olarak siler; bu cihazdaki veriler kalır. */
  async deleteAccount(): Promise<void> {
    await accountBackupDatasource.deleteAccount(await this.token());
    await this.signOut();
  }
}

export const accountRepository = new AccountRepository();
