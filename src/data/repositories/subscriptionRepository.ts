import {
  createPurchasesDatasource,
  PreviewPurchasesDatasource,
  type IPurchasesDatasource,
} from '@/src/data/datasources/purchasesDatasource';
import type { SubscriptionPackage } from '@/src/domain/models';

export class SubscriptionRepository {
  constructor(private readonly datasource: IPurchasesDatasource = createPurchasesDatasource()) {}

  get configured(): boolean {
    return this.datasource.configured;
  }

  /** Yalnızca anahtarsız (önizleme) modda ve geliştirme derlemesinde anlamlıdır. */
  get canSimulate(): boolean {
    return __DEV__ && this.datasource instanceof PreviewPurchasesDatasource;
  }

  isPremium(): Promise<boolean> {
    return this.datasource.isPremium();
  }

  getPackages(): Promise<SubscriptionPackage[]> {
    return this.datasource.getPackages();
  }

  purchase(packageId: string): Promise<boolean> {
    return this.datasource.purchase(packageId);
  }

  restore(): Promise<boolean> {
    return this.datasource.restore();
  }

  managementUrl(): Promise<string | null> {
    return this.datasource.managementUrl();
  }

  trialEndsAt(): Promise<Date | null> {
    return this.datasource.trialEndsAt();
  }

  onPremiumChange(listener: (premium: boolean) => void): () => void {
    return this.datasource.onPremiumChange(listener);
  }

  identify(userId: string): Promise<boolean> {
    return this.datasource.identify(userId);
  }

  reset(): Promise<void> {
    return this.datasource.reset();
  }

  simulatePremium(premium: boolean) {
    if (this.canSimulate) (this.datasource as PreviewPurchasesDatasource).simulate(premium);
  }
}

export const subscriptionRepository = new SubscriptionRepository();
