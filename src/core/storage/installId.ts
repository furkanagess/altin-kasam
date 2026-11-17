import { storageGet, storageSet } from '@/src/core/storage/storage';

const INSTALL_KEY = 'altin_kasam_install_id_v1';

function randomId(): string {
  const bytes = Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36));
  return `i${bytes.join('')}`;
}

/**
 * Cihaza özgü, tahmin edilemez kimlik; sunucuda alarmların sahibini ayırır ve destek mesajlarını
 * sınırlar. Uygulama silinince yenilenir.
 */
export async function getInstallId(): Promise<string> {
  const saved = await storageGet<string>(INSTALL_KEY);
  if (saved) return saved;
  const id = randomId();
  await storageSet(INSTALL_KEY, id);
  return id;
}
