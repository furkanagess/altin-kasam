import Constants from 'expo-constants';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let handle: NotificationsModule | null | undefined;

/**
 * Fiyat alarmları: "çın" sesiyle. Android'de kanal sesi oluşturulduktan sonra değiştirilemez, bu yüzden
 * ses eklenirken yeni bir kanal kimliği açıldı (sunucudaki `CHANNEL_ID` ile aynı olmalı).
 */
const ANDROID_CHANNEL_ID = 'price-alarms-chlinc';
/** Ekonomik takvim hatırlatmaları: varsayılan bildirim sesi. */
const REMINDER_CHANNEL_ID = 'price-alarms';
/** `expo-notifications` eklentisiyle pakete eklenen ses dosyası (app.json `sounds`). */
const ALARM_SOUND = 'coin_chlinc.wav';

/**
 * `expo-notifications` içe aktarıldığı anda native modülü ister; paket eklenmeden önce alınmış
 * development build'de ve web'de bu modül yoktur. İlk kullanımda yüklenir; yüklenemezse
 * bildirim yerine uygulama içi uyarı kullanılır.
 */
function load(): NotificationsModule | null {
  if (handle !== undefined) return handle;
  if (Platform.OS === 'web') return (handle = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('expo-notifications') as NotificationsModule;
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handle = module;
  } catch {
    handle = null;
  }
  return handle;
}

export const notificationsDatasource = {
  isAvailable(): boolean {
    return load() !== null;
  },

  /** İzin yoksa ister; reddedilirse ya da modül yoksa `false`. */
  async ensurePermission(): Promise<boolean> {
    const notifications = load();
    if (!notifications) return false;
    try {
      if (Platform.OS === 'android') {
        await notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: 'Fiyat alarmları',
          importance: notifications.AndroidImportance.HIGH,
          sound: ALARM_SOUND,
        });
        await notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
          name: 'Hatırlatmalar',
          importance: notifications.AndroidImportance.HIGH,
        });
      }
      const current = await notifications.getPermissionsAsync();
      if (current.granted) return true;
      const requested = await notifications.requestPermissionsAsync();
      // Tutunma ölçüsü: izin isteğinin sonucu (yalnızca gerçekten sorulduğunda).
      analyticsDatasource.track({ name: 'notification_permission', granted: requested.granted });
      return requested.granted;
    } catch {
      return false;
    }
  },

  /**
   * Uzaktan (sunucudan) bildirim için Expo push token'ı. İzin yoksa, EAS `projectId` tanımlı değilse,
   * Android'de `google-services.json` yoksa ya da cihaz desteklemiyorsa `null`; alarmlar o zaman
   * yalnızca uygulama açıkken kontrol edilir.
   */
  async getPushToken(): Promise<string | null> {
    const notifications = load();
    if (!notifications) return null;
    try {
      if (!(await notifications.getPermissionsAsync()).granted) return null;
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return null;
      return (await notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch {
      return null;
    }
  },

  /**
   * Bildirime dokununca uygulama içi yol (`/post/abc`) ile çağrılır; uygulama bildirimle
   * soğuk açıldıysa son bildirim de işlenir. Dönen fonksiyon dinlemeyi bırakır.
   */
  onOpen(listener: (path: string) => void): () => void {
    const notifications = load();
    if (!notifications) return () => {};
    const handle = (data: unknown) => {
      const path = (data as { path?: unknown } | undefined)?.path;
      if (typeof path === 'string' && path.startsWith('/')) listener(path);
    };
    notifications
      .getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handle(response.notification.request.content.data);
      })
      .catch(() => {
        // Son bildirim okunamazsa yalnızca bundan sonrakiler işlenir.
      });
    const subscription = notifications.addNotificationResponseReceivedListener((response) =>
      handle(response.notification.request.content.data),
    );
    return () => subscription.remove();
  },

  /** Hemen gösterilen yerel bildirim; `path` dokununca açılacak ekran. İzin yoksa `false`. */
  async present(title: string, body: string, path: string): Promise<boolean> {
    const notifications = load();
    if (!notifications) return false;
    try {
      // İzin yokken iOS isteği sessizce yutar; çağıran uygulama içi uyarıya düşebilsin.
      if (!(await notifications.getPermissionsAsync()).granted) return false;
      await notifications.scheduleNotificationAsync({
        content: { title, body, data: { path }, sound: ALARM_SOUND },
        trigger: Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null,
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Belirli bir anda gösterilecek yerel bildirim; uygulama kapalıyken de gelir. Aynı `identifier`
   * ile yeniden kurulursa eskisinin yerini alır. İzin yoksa ya da an geçmişse `false`.
   */
  async scheduleAt(identifier: string, date: Date, title: string, body: string, path: string): Promise<boolean> {
    const notifications = load();
    if (!notifications || date.getTime() <= Date.now()) return false;
    try {
      if (!(await notifications.getPermissionsAsync()).granted) return false;
      await notifications.scheduleNotificationAsync({
        identifier,
        content: { title, body, data: { path } },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DATE,
          date,
          ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Her hafta aynı gün ve saatte tekrarlanan yerel bildirim (`weekday`: 1 = pazar … 7 = cumartesi).
   * Aynı `identifier` ile yeniden kurulursa eskisinin yerini alır. İzin yoksa `false`; izin istemez.
   */
  async scheduleWeekly(
    identifier: string,
    when: { weekday: number; hour: number; minute: number },
    title: string,
    body: string,
    path: string,
  ): Promise<boolean> {
    const notifications = load();
    if (!notifications) return false;
    try {
      if (!(await notifications.getPermissionsAsync()).granted) return false;
      await notifications.scheduleNotificationAsync({
        identifier,
        content: { title, body, data: { path } },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.WEEKLY,
          ...when,
          ...(Platform.OS === 'android' ? { channelId: REMINDER_CHANNEL_ID } : {}),
        },
      });
      return true;
    } catch {
      return false;
    }
  },

  /** Kurulu (henüz gösterilmemiş) yerel bildirimlerin kimlikleri; okunamazsa `null`. */
  async scheduledIds(): Promise<Set<string> | null> {
    const notifications = load();
    if (!notifications) return null;
    try {
      const all = await notifications.getAllScheduledNotificationsAsync();
      return new Set(all.map((n) => n.identifier));
    } catch {
      return null;
    }
  },

  async cancel(identifier: string): Promise<void> {
    try {
      await load()?.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Bildirim zaten gösterilmiş ya da hiç kurulmamış olabilir.
    }
  },
};
