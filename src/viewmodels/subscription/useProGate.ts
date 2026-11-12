import { FREE_EXPORT_USES, type PaywallReason } from '@/src/core/constants/premium';
import { freeUsageRepository, type MeteredFeature } from '@/src/data/repositories/freeUsageRepository';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useCallback, useEffect, useState } from 'react';

const REASONS: Record<MeteredFeature, PaywallReason> = { csv: 'export', image: 'shareImage' };

/**
 * Pro özelliği, ücretsiz planda `FREE_EXPORT_USES` kez denenebilir. `guard` hak yoksa ödeme
 * ekranını açıp false döner; `consume` hakkı işlem gerçekten başlayınca düşer.
 */
export function useProGate(feature: MeteredFeature) {
  const { isPremium, openPaywall } = useSubscription();
  const [used, setUsed] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void freeUsageRepository.used(feature).then((n) => {
      if (alive) setUsed(n);
    });
    return () => {
      alive = false;
    };
  }, [feature]);

  /** Kalan ücretsiz hak; Pro üyede null (sınırsız). */
  const remaining = isPremium ? null : Math.max(0, FREE_EXPORT_USES - (used ?? 0));

  const guard = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true;
    const count = await freeUsageRepository.used(feature);
    setUsed(count);
    if (count < FREE_EXPORT_USES) return true;
    openPaywall(REASONS[feature]);
    return false;
  }, [isPremium, feature, openPaywall]);

  const consume = useCallback(async () => {
    if (isPremium) return;
    setUsed(await freeUsageRepository.consume(feature));
  }, [isPremium, feature]);

  return { isPremium, remaining, guard, consume };
}
