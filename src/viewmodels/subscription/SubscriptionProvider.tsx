import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import type { PaywallReason } from '@/src/core/constants/premium';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import { subscriptionRepository } from '@/src/data/repositories/subscriptionRepository';
import { syncTrialReminder } from '@/src/data/repositories/trialReminderRepository';
import type { SubscriptionPackage } from '@/src/domain/models';
import { router } from 'expo-router';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type SubscriptionContextValue = {
  isPremium: boolean;
  /** RevenueCat anahtarı tanımlı mı; değilse satın alma yapılamaz. */
  configured: boolean;
  canSimulate: boolean;
  packages: SubscriptionPackage[];
  packagesLoading: boolean;
  loadPackages: () => Promise<void>;
  purchase: (packageId: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  managementUrl: () => Promise<string | null>;
  openPaywall: (reason?: PaywallReason) => void;
  simulatePremium: (premium: boolean) => void;
};

/** Son bilinen premium durumu; çevrimdışı ya da yavaş açılışta ücretsiz moda düşmemek için. */
const PREMIUM_CACHE_KEY = 'altin_kasam_premium_v1';

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [realPremium, setIsPremium] = useState(false);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const isPremium = realPremium;

  // RevenueCat hesap gerçeğidir; yanıt gelene kadar (ya da çevrimdışıyken) önbellekteki değer kullanılır.
  // Anahtarsız önizleme modunda simüle edilen Pro kalıcılaştırılmaz.
  const setPremium = useCallback((premium: boolean) => {
    setIsPremium(premium);
    if (subscriptionRepository.configured) void storageSet(PREMIUM_CACHE_KEY, premium).catch(() => {});
  }, []);

  // Deneme bitmeden önceki gün hatırlatması: açılışta ve Pro durumu her değiştiğinde yeniden kurulur
  // (iptal edilen ya da ücretliye dönen denemede kaldırılır).
  useEffect(() => {
    if (subscriptionRepository.configured) void syncTrialReminder(isPremium);
  }, [isPremium]);

  useEffect(() => {
    let alive = true;
    if (subscriptionRepository.configured) {
      storageGet<boolean>(PREMIUM_CACHE_KEY)
        .then((cached) => {
          if (alive && cached === true) setIsPremium(true);
        })
        .catch(() => {});
    }
    subscriptionRepository
      .isPremium()
      .then((premium) => {
        if (alive) setPremium(premium);
      })
      .catch(() => {
        // Durum okunamazsa ücretsiz modda kalınır; değişiklik dinleyicisi sonra düzeltir.
      });
    const unsubscribe = subscriptionRepository.onPremiumChange(setPremium);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [setPremium]);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      setPackages(await subscriptionRepository.getPackages());
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const purchase = useCallback(async (packageId: string) => {
    const premium = await subscriptionRepository.purchase(packageId);
    setPremium(premium);
    if (premium) {
      // Paket, deneme ve offering ile: fiyat / deneme deneylerini RevenueCat dışında da okuyabilmek için.
      const pkg = packages.find((p) => p.id === packageId);
      const props = { period: pkg?.period ?? 'unknown', offering: pkg?.offeringId ?? 'unknown' };
      analyticsDatasource.track({ name: 'pro_purchased', ...props, trial: Boolean(pkg?.trial) });
      if (pkg?.trial) analyticsDatasource.track({ name: 'trial_started', ...props });
    }
    return premium;
  }, [setPremium, packages]);

  const restore = useCallback(async () => {
    const premium = await subscriptionRepository.restore();
    setPremium(premium);
    if (premium) analyticsDatasource.track({ name: 'pro_restored' });
    return premium;
  }, [setPremium]);

  const managementUrl = useCallback(() => subscriptionRepository.managementUrl(), []);

  const openPaywall = useCallback((reason?: PaywallReason) => {
    analyticsDatasource.track({ name: 'paywall_viewed', reason: reason ?? 'direct' });
    router.push({ pathname: '/paywall', params: reason ? { reason } : {} });
  }, []);

  const simulatePremium = useCallback((premium: boolean) => {
    subscriptionRepository.simulatePremium(premium);
  }, []);

  const value = useMemo(
    () => ({
      isPremium,
      configured: subscriptionRepository.configured,
      canSimulate: subscriptionRepository.canSimulate,
      packages,
      packagesLoading,
      loadPackages,
      purchase,
      restore,
      managementUrl,
      openPaywall,
      simulatePremium,
    }),
    [
      isPremium,
      packages,
      packagesLoading,
      loadPackages,
      purchase,
      restore,
      managementUrl,
      openPaywall,
      simulatePremium,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
}
