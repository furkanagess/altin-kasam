import type { HomeWidgetProps } from '@/src/domain/models';

type WidgetHandle = { updateSnapshot(props: HomeWidgetProps): void };

let handle: WidgetHandle | null | undefined;

/**
 * `expo-widgets` içe aktarıldığı anda native modülü ister; Expo Go'da bu modül yoktur.
 * Modül ilk kullanımda yüklenir; yüklenemezse widget sessizce devre dışı kalır.
 */
function load(): WidgetHandle | null {
  if (handle !== undefined) return handle;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    handle = (require('@/src/homeWidgets/PriceWidget').default as WidgetHandle | null) ?? null;
  } catch {
    handle = null;
  }
  return handle;
}

export const homeWidgetDatasource = {
  /** Development build'de iOS/Android; Expo Go ve web'de `false`. */
  isAvailable(): boolean {
    return load() !== null;
  },
  update(props: HomeWidgetProps): void {
    try {
      load()?.updateSnapshot(props);
    } catch {
      // Widget eklenmemişse ya da sistem güncellemeyi reddederse uygulama etkilenmez.
    }
  },
};
