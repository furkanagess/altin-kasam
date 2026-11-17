import { ACCOUNT_SYNC_KEYS, type AuthProviderId } from '@/src/core/constants/account';
import { onStorageChange } from '@/src/core/storage/storage';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { accountRepository, type Account, type LinkResult } from '@/src/data/repositories/accountRepository';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

type AccountContextValue = {
  /** Hesap bağlama bu derlemede sunuluyor mu (Firebase anahtarları ve native modüller). */
  configured: boolean;
  googleAvailable: boolean;
  appleAvailable: boolean;
  account: Account | null;
  /** Bağlanmakta olan sağlayıcı. */
  linking: AuthProviderId | null;
  link: (provider: AuthProviderId) => Promise<LinkResult | null>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const SYNC_KEYS = new Set<string>(ACCOUNT_SYNC_KEYS);
/** Art arda değişiklikler (ör. alarm + kasa) tek yüklemede toplanır. */
const PUSH_DEBOUNCE_MS = 4_000;

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * Bağlı hesap (Google/Apple, Firebase). Hesaptan cihaza veri yazıldığında içteki sağlayıcılar
 * yeniden kurulur ki kasa, alarm, takip listesi gibi durumlar depodan yeniden okunsun.
 */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const configured = accountRepository.configured;
  const [account, setAccount] = useState<Account | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [linking, setLinking] = useState<AuthProviderId | null>(null);
  const [dataEpoch, setDataEpoch] = useState(0);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = null;
    // Hata olursa değişiklik "bekliyor" kalır; sonraki açılışta ya da değişiklikte yeniden denenir.
    void accountRepository.push().catch(() => {});
  }, []);

  // Açılış: kayıtlı oturumu yükle, sonra hesapla eşitle.
  useEffect(() => {
    if (!configured) return;
    let alive = true;
    void accountRepository.isAppleAvailable().then((ok) => alive && setAppleAvailable(ok));
    void (async () => {
      const restored = await accountRepository.restoreSession().catch(() => null);
      if (!alive || !restored) return;
      setAccount(restored);
      const changed = await accountRepository.pull().catch(() => false);
      if (alive && changed) setDataEpoch((n) => n + 1);
    })();
    return () => {
      alive = false;
    };
  }, [configured]);

  // Hesaba taşınan anahtarlardan biri değişince hesaba otomatik yedekle.
  useEffect(() => {
    if (!configured) return;
    const unsubscribe = onStorageChange((key) => {
      if (!accountRepository.linked || !SYNC_KEYS.has(key)) return;
      void accountRepository.markDirty().catch(() => {});
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(flush, PUSH_DEBOUNCE_MS);
    });
    // Uygulama arka plana geçerken bekleyen yükleme hemen gönderilir.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && pushTimer.current) flush();
    });
    return () => {
      unsubscribe();
      sub.remove();
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [configured, flush]);

  const link = useCallback(async (provider: AuthProviderId) => {
    setLinking(provider);
    try {
      const result = await accountRepository.link(provider);
      if (!result) return null;
      setAccount(result.account);
      analyticsDatasource.track({ name: 'account_linked', provider, restored: result.restored });
      if (result.restored) setDataEpoch((n) => n + 1);
      return result;
    } finally {
      setLinking(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (pushTimer.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = null;
      await accountRepository.push().catch(() => {});
    }
    await accountRepository.signOut();
    setAccount(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = null;
    await accountRepository.deleteAccount();
    setAccount(null);
    analyticsDatasource.track({ name: 'account_deleted' });
  }, []);

  const value = useMemo(
    () => ({
      configured,
      googleAvailable: accountRepository.isGoogleAvailable(),
      appleAvailable,
      account,
      linking,
      link,
      signOut,
      deleteAccount,
    }),
    [configured, appleAvailable, account, linking, link, signOut, deleteAccount],
  );

  return (
    <AccountContext.Provider value={value}>
      <React.Fragment key={dataEpoch}>{children}</React.Fragment>
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used within AccountProvider');
  return ctx;
}
