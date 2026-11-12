import { storageGet, storageSet } from '@/src/core/storage/storage';

/** Ücretsiz planda sınırlı kullanım hakkı olan Pro özellikleri. */
export type MeteredFeature = 'csv' | 'image';

const KEY = 'altin_kasam_free_uses_v1';

type Counts = Partial<Record<MeteredFeature, number>>;

/** Özellik başına kullanılan hak sayısı; cihazda tutulur, uygulama silinene kadar sıfırlanmaz. */
export class FreeUsageRepository {
  async used(feature: MeteredFeature): Promise<number> {
    try {
      return (await storageGet<Counts>(KEY))?.[feature] ?? 0;
    } catch {
      // Okunamazsa kullanıcı cezalandırılmaz.
      return 0;
    }
  }

  async consume(feature: MeteredFeature): Promise<number> {
    const counts = (await storageGet<Counts>(KEY).catch(() => null)) ?? {};
    const next = (counts[feature] ?? 0) + 1;
    await storageSet(KEY, { ...counts, [feature]: next }).catch(() => {});
    return next;
  }
}

export const freeUsageRepository = new FreeUsageRepository();
