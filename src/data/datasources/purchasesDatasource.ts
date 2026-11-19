import type { SubscriptionPackage } from '@/src/domain/models';
import { Platform } from 'react-native';
import { createRevenueCat } from '@/src/data/datasources/revenueCatFactory';

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
  return API_KEY ? createRevenueCat(API_KEY) : new PreviewPurchasesDatasource();
}
