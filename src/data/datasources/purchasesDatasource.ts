import { PREMIUM_ENTITLEMENT } from '@/src/core/constants/premium';
import type { SubscriptionPackage, SubscriptionPeriod } from '@/src/domain/models';
import { Platform } from 'react-native';
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

export interface IPurchasesDatasource {
  /** API anahtarı yoksa false; satın alma yapılamaz, uygulama ücretsiz modda çalışır. */
  readonly configured: boolean;
  isPremium(): Promise<boolean>;
  getPackages(): Promise<SubscriptionPackage[]>;
  /** Kullanıcı vazgeçerse hata fırlatmaz, mevcut durumu döner. */
  purchase(packageId: string): Promise<boolean>;
  restore(): Promise<boolean>;
  managementUrl(): Promise<string | null>;
  /** Pro ücretsiz denemedeyse ve yenilenecekse deneme bitişi; değilse null. */
  trialEndsAt(): Promise<Date | null>;
  onPremiumChange(listener: (premium: boolean) => void): () => void;
  /**
   * Aboneliği bağlı hesaba (Firebase uid) taşır: RevenueCat anonim kullanıcının satın alımlarını
   * bu kimliğe aktarır; aynı hesapla giriş yapılan her cihazda Pro açılır. Premium durumunu döner.
   */
  identify(userId: string): Promise<boolean>;
  /** Hesap bağlantısı kesilince anonim kullanıcıya döner. */
  reset(): Promise<void>;
}

/**
 * RevenueCat'in public SDK anahtarları uygulamaya gömülmek üzere tasarlanmıştır
 * (gizli anahtar değildir), bu yüzden EXPO_PUBLIC_ ile verilir.
 */
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_KEY,
});

const PERIODS: Partial<Record<PACKAGE_TYPE, SubscriptionPeriod>> = {
  [PACKAGE_TYPE.MONTHLY]: 'monthly',
  [PACKAGE_TYPE.ANNUAL]: 'annual',
  [PACKAGE_TYPE.LIFETIME]: 'lifetime',
};

const TRIAL_UNITS: Record<string, string> = {
  DAY: 'gün',
  WEEK: 'hafta',
  MONTH: 'ay',
  YEAR: 'yıl',
};

function hasPremium(info: CustomerInfo): boolean {
  return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}

function toPackage(pkg: PurchasesPackage, offeringId?: string): SubscriptionPackage {
  const intro = pkg.product.introPrice;
  const unit = intro ? TRIAL_UNITS[intro.periodUnit] : undefined;
  return {
    id: pkg.identifier,
    title: pkg.product.title,
    priceString: pkg.product.priceString,
    price: pkg.product.price,
    period: PERIODS[pkg.packageType] ?? 'other',
    trial:
      intro && intro.price === 0 && unit
        ? `${intro.periodNumberOfUnits} ${unit} ücretsiz`
        : undefined,
    offeringId,
  };
}

function isCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

export class RevenueCatPurchasesDatasource implements IPurchasesDatasource {
  readonly configured = true;
  /** Satın alma için SDK paketi gerekir; domain'e yalnızca kimlik çıkar. */
  private readonly packages = new Map<string, PurchasesPackage>();

  constructor(apiKey: string) {
    Purchases.configure({ apiKey });
  }

  async isPremium(): Promise<boolean> {
    return hasPremium(await Purchases.getCustomerInfo());
  }

  async getPackages(): Promise<SubscriptionPackage[]> {
    const offerings = await Purchases.getOfferings();
    const available = offerings.current?.availablePackages ?? [];
    this.packages.clear();
    for (const pkg of available) this.packages.set(pkg.identifier, pkg);
    return available.map((pkg) => toPackage(pkg, offerings.current?.identifier));
  }

  async purchase(packageId: string): Promise<boolean> {
    const pkg = this.packages.get(packageId);
    if (!pkg) throw new Error('Paket bulunamadı; ödeme ekranını yeniden açın.');
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return hasPremium(customerInfo);
    } catch (error) {
      if (isCancellation(error)) return this.isPremium();
      throw error;
    }
  }

  async restore(): Promise<boolean> {
    return hasPremium(await Purchases.restorePurchases());
  }

  async managementUrl(): Promise<string | null> {
    return (await Purchases.getCustomerInfo()).managementURL;
  }

  async trialEndsAt(): Promise<Date | null> {
    const entitlement = (await Purchases.getCustomerInfo()).entitlements.active[PREMIUM_ENTITLEMENT];
    if (!entitlement || entitlement.periodType !== 'TRIAL' || !entitlement.willRenew) return null;
    return entitlement.expirationDate ? new Date(entitlement.expirationDate) : null;
  }

  onPremiumChange(listener: (premium: boolean) => void): () => void {
    const handler = (info: CustomerInfo) => listener(hasPremium(info));
    Purchases.addCustomerInfoUpdateListener(handler);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(handler);
    };
  }

  async identify(userId: string): Promise<boolean> {
    const { customerInfo } = await Purchases.logIn(userId);
    return hasPremium(customerInfo);
  }

  async reset(): Promise<void> {
    if (await Purchases.isAnonymous()) return;
    await Purchases.logOut();
  }
}

/**
 * Anahtar yokken kullanılır. Geliştirmede kilitleri denemek için Pro
 * bellekte simüle edilebilir; yayın derlemesinde `simulate` çağrılmaz.
 */
export class PreviewPurchasesDatasource implements IPurchasesDatasource {
  readonly configured = false;
  private premium = false;
  private readonly listeners = new Set<(premium: boolean) => void>();

  async isPremium(): Promise<boolean> {
    return this.premium;
  }

  async getPackages(): Promise<SubscriptionPackage[]> {
    return [];
  }

  async purchase(): Promise<boolean> {
    throw new Error('Satın alma yapılandırılmadı (RevenueCat API anahtarı yok).');
  }

  async restore(): Promise<boolean> {
    return this.premium;
  }

  async managementUrl(): Promise<string | null> {
    return null;
  }

  async trialEndsAt(): Promise<Date | null> {
    return null;
  }

  onPremiumChange(listener: (premium: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async identify(): Promise<boolean> {
    return this.premium;
  }

  async reset(): Promise<void> {}

  simulate(premium: boolean) {
    this.premium = premium;
    for (const listener of this.listeners) listener(premium);
  }
}

export function createPurchasesDatasource(): IPurchasesDatasource {
  return API_KEY ? new RevenueCatPurchasesDatasource(API_KEY) : new PreviewPurchasesDatasource();
}
