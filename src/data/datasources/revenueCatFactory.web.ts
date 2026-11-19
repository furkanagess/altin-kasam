import type { IPurchasesDatasource } from '@/src/data/datasources/purchasesDatasource';

/**
 * Web: RevenueCat SDK'sı (web ödeme eşlemeleriyle) büyüktür. İlk kullanımda dinamik `import()` ile
 * ayrı parça olarak yüklenir; sayfanın ilk açılışını yavaşlatmaz.
 */
class LazyRevenueCatPurchasesDatasource implements IPurchasesDatasource {
  readonly configured = true;
  private inner: Promise<IPurchasesDatasource> | null = null;

  constructor(private readonly apiKey: string) {}

  private load(): Promise<IPurchasesDatasource> {
    this.inner ??= import('@/src/data/datasources/revenueCatPurchasesDatasource').then(
      (m) => new m.RevenueCatPurchasesDatasource(this.apiKey),
    );
    return this.inner;
  }

  isPremium() {
    return this.load().then((d) => d.isPremium());
  }
  getPackages() {
    return this.load().then((d) => d.getPackages());
  }
  purchase(packageId: string) {
    return this.load().then((d) => d.purchase(packageId));
  }
  restore() {
    return this.load().then((d) => d.restore());
  }
  managementUrl() {
    return this.load().then((d) => d.managementUrl());
  }
  trialEndsAt() {
    return this.load().then((d) => d.trialEndsAt());
  }
  identify(userId: string) {
    return this.load().then((d) => d.identify(userId));
  }
  reset() {
    return this.load().then((d) => d.reset());
  }

  onPremiumChange(listener: (premium: boolean) => void): () => void {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    void this.load().then((d) => {
      if (!cancelled) unsubscribe = d.onPremiumChange(listener);
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }
}

export function createRevenueCat(apiKey: string): IPurchasesDatasource {
  return new LazyRevenueCatPurchasesDatasource(apiKey);
}
