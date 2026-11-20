import { PREMIUM_ENTITLEMENT } from '@/src/core/constants/premium';
import type { IPurchasesDatasource } from '@/src/data/datasources/purchasesDatasource';
import type { SubscriptionPackage, SubscriptionPeriod } from '@/src/domain/models';
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

/**
 * RevenueCat SDK'sına bağlı kısım ayrı dosyadadır: web'de SDK büyük (web ödeme eşlemeleri) ve
 * yalnızca gerektiğinde, ayrı bir parça olarak yüklenir (`revenueCatFactory.web.ts`).
 */

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

/**
 * Uygulamada tek ücretli seviye (Pro) vardır. Entitlement adı panelde farklı yazılmışsa ya da ürün
 * entitlement'a bağlanmamışsa bile aktif bir abonelik Pro sayılır (App Review'da satın alma sonrası
 * Pro'nun açılmaması bu yüzden reddedilmişti).
 */
function hasPremium(info: CustomerInfo): boolean {
  return (
    info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined ||
    Object.keys(info.entitlements.active).length > 0 ||
    info.activeSubscriptions.length > 0
  );
}

const ACTIVATION_RETRIES = 3;
const ACTIVATION_DELAY_MS = 1500;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
      if (hasPremium(customerInfo)) return true;
      // Sandbox'ta makbuz doğrulaması birkaç saniye gecikebilir: önbelleği atlayıp yeniden sorulur,
      // olmazsa mağaza makbuzu RevenueCat'e yeniden gönderilir.
      for (let i = 0; i < ACTIVATION_RETRIES; i++) {
        await wait(ACTIVATION_DELAY_MS);
        await Purchases.invalidateCustomerInfoCache();
        if (hasPremium(await Purchases.getCustomerInfo())) return true;
      }
      if (hasPremium(await Purchases.restorePurchases())) return true;
      throw new Error(
        'Ödemen alındı ancak Pro henüz etkinleşmedi. Birkaç saniye sonra "Satın alımları geri yükle"ye dokun.',
      );
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

