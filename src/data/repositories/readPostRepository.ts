import { storageGet, storageSet } from '@/src/core/storage/storage';

const READ_KEY = 'altin_kasam_read_posts_v1';
/** Okunan kimlikler sınırsız büyümesin; akış yalnızca bugünü içerdiği için son kayıtlar yeterli. */
const MAX_READ = 500;

/** Detayı açılmış haber ve gönderiler; akışta "Okundu" olarak işaretlenip sona alınır. */
export class ReadPostRepository {
  async list(): Promise<string[]> {
    return (await storageGet<string[]>(READ_KEY)) ?? [];
  }

  async markRead(id: string): Promise<string[]> {
    const current = await this.list();
    if (current[0] === id) return current;
    const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_READ);
    await storageSet(READ_KEY, next);
    return next;
  }
}

export const readPostRepository = new ReadPostRepository();
