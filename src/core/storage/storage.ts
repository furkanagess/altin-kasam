import AsyncStorage from '@react-native-async-storage/async-storage';

type ChangeListener = (key: string) => void;
const listeners = new Set<ChangeListener>();

/** Her yazma/silme sonrası anahtarla çağrılır (ör. bağlı hesaba otomatik yedekleme). */
export function onStorageChange(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(key: string) {
  for (const listener of listeners) {
    try {
      listener(key);
    } catch {
      // Dinleyici hatası yazmayı bozmaz.
    }
  }
}

export async function storageGet<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  emit(key);
}

export async function storageRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  emit(key);
}

/** Ham (JSON metni) değerleri toplu okur; yalnızca var olan anahtarlar döner. */
export async function storageGetRaw(keys: readonly string[]): Promise<Record<string, string>> {
  const pairs = await AsyncStorage.multiGet(keys);
  const out: Record<string, string> = {};
  for (const [key, value] of pairs) if (value != null) out[key] = value;
  return out;
}

/** Ham değerleri toplu yazar; değişiklik dinleyicilerini tetiklemez (geri yükleme içindir). */
export async function storageSetRaw(values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values);
  if (entries.length) await AsyncStorage.multiSet(entries);
}
