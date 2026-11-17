import { storageGet, storageSet } from '@/src/core/storage/storage';

/** `pending`: onboarding bitti, tur henüz gösterilmedi. `done`: tamamlandı ya da atlandı. */
export type TourStatus = 'pending' | 'done';

const KEY = 'altin_kasam_tour_v1';

export class TourRepository {
  async getStatus(): Promise<TourStatus | null> {
    try {
      return await storageGet<TourStatus>(KEY);
    } catch {
      // Okunamazsa tur zorla açılmaz.
      return null;
    }
  }

  async setStatus(status: TourStatus): Promise<void> {
    await storageSet(KEY, status).catch(() => {});
  }
}

export const tourRepository = new TourRepository();
