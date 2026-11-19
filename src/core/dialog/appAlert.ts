import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * `Alert.alert` ile aynı imza. Native'de doğrudan ona gider; web'de react-native-web `Alert`
 * hiçbir şey göstermediği için uygulamanın kendi diyaloğu (`DialogHost`) açılır.
 */
export type AppDialog = { id: number; title: string; message?: string; buttons: AlertButton[] };

type Listener = (queue: readonly AppDialog[]) => void;

let queue: AppDialog[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function publish() {
  for (const listener of listeners) listener(queue);
}

export function subscribeDialogs(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
}

/** Diyalog kapanır ve (varsa) seçilen düğmenin işlemi çalışır. */
export function resolveDialog(id: number, button?: AlertButton) {
  queue = queue.filter((d) => d.id !== id);
  publish();
  button?.onPress?.();
}

export function appAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  queue = [...queue, { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'Tamam' }] }];
  publish();
}
