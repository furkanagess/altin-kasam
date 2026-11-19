import type { IPurchasesDatasource } from '@/src/data/datasources/purchasesDatasource';
import { RevenueCatPurchasesDatasource } from '@/src/data/datasources/revenueCatPurchasesDatasource';

/** Native: SDK doğrudan yüklenir (web için `revenueCatFactory.web.ts`). */
export function createRevenueCat(apiKey: string): IPurchasesDatasource {
  return new RevenueCatPurchasesDatasource(apiKey);
}
