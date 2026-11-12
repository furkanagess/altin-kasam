import {
  alarmPriceOf,
  alarmValueNoun,
  getAlarmAsset,
  PORTFOLIO_ALARM_ID,
} from '@/src/core/constants/alarmAssets';
import { FREE_ALARM_LIMIT } from '@/src/core/constants/premium';
import { alarmSyncDatasource, type SyncableAlarm } from '@/src/data/datasources/alarmSyncDatasource';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';
import { alarmRepository, type NewAlarmInput } from '@/src/data/repositories/alarmRepository';
import type { PriceAlarm } from '@/src/domain/models';
import { formatNumber } from '@/src/utils/format';
import { useValueMoments } from '@/src/viewmodels/engagement/useValueMoments';
import { useAlarmPrices } from '@/src/viewmodels/alarm/useAlarmPrices';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

type AlarmContextValue = {
  alarms: PriceAlarm[];
  /** Tetiklenmemiş alarmlar; ücretsiz plan sınırı bunlara uygulanır. */
  activeCount: number;
  canAdd: boolean;
  /** Bildirim gönderilemiyorsa (modül yok / izin yok) alarm uygulama içi uyarıyla bildirilir. */
  notificationsAvailable: boolean;
  /** Sunucu tarafı alarm yapılandırıldı: bildirim izni varsa uygulama kapalıyken de kontrol edilir. */
  serverAlarms: boolean;
  /** Tetiklenmiş ama henüz alarm ekranında görülmemiş alarm sayısı; `assetId` verilirse yalnızca o varlık için. */
  unseenCount: (assetId?: string) => number;
  /** Tetiklenmiş alarmları görüldü işaretler (rozet kaybolur); `assetId` verilmezse hepsi. */
  markSeen: (assetId?: string) => Promise<void>;
  /** Sınır doluysa ödeme ekranını açar ve `false` döner. */
  addAlarm: (input: NewAlarmInput) => Promise<boolean>;
  removeAlarm: (id: string) => Promise<void>;
  /** Bekleyen alarmın yönünü/hedefini değiştirir; ücretsiz plan sınırına etkisi yoktur. */
  updateAlarm: (id: string, patch: Pick<PriceAlarm, 'direction' | 'target'>) => Promise<void>;
};

const AlarmContext = createContext<AlarmContextValue | null>(null);

const NOUN_TITLE = { alış: 'Fiyat', değer: 'Değer', rasyo: 'Rasyo' } as const;

/** Bildirim metni; sunucudan gelen push (`firebase/functions`) ile aynı biçimdedir. */
function alarmMessage(alarm: PriceAlarm, price: number) {
  const asset = getAlarmAsset(alarm.assetId);
  return {
    title: `${asset?.label ?? 'Altın'} Alarmı Tetiklendi`,
    body: `Güncel ${asset ? NOUN_TITLE[alarmValueNoun(asset)] : 'Fiyat'} ${formatNumber(price)}${alarm.note ? ` · ${alarm.note}` : ''}`,
  };
}

/** Sunucunun izleyebildiği alarmlar: kasa toplamı yalnızca cihazda bilindiği için dışarıda kalır. */
function syncPayload(alarms: PriceAlarm[]): SyncableAlarm[] {
  return alarms.flatMap((alarm) => {
    const asset = getAlarmAsset(alarm.assetId);
    if (alarm.triggeredAt || !asset || asset.id === PORTFOLIO_ALARM_ID) return [];
    return [
      {
        ...alarm,
        label: asset.label,
        noun: alarmValueNoun(asset),
        unit: asset.kind === 'ratio' ? ('ratio' as const) : ('try' as const),
      },
    ];
  });
}

/**
 * Alarmlar cihazda saklanır ve fiyat her güncellendiğinde kontrol edilir; bu kontrol uygulama
 * açıkken çalışır. Bildirim izni ve Firebase eşitleme adresi varsa bekleyen alarmlar ayrıca sunucuya
 * da yazılır ve uygulama kapalıyken oradan push ile bildirilir. Sunucuda tetiklenen alarm açılışta
 * "tetiklendi" işaretlenir, bu yüzden aynı alarm iki kez bildirilmez.
 */
export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const prices = useAlarmPrices();
  const { isPremium, openPaywall } = useSubscription();
  const { reach } = useValueMoments();
  const [alarms, setAlarms] = useState<PriceAlarm[]>([]);
  const inFlight = useRef(new Set<string>());
  const lastSynced = useRef('');
  // Açılışta sunucu eşitlemesi bitmeden yerel kontrol çalışmaz: sunucuda tetiklenen alarm tekrar bildirilmesin.
  const [ready, setReady] = useState(false);

  /** Bekleyen alarmları sunucuyla eşitler; sunucuda tetiklenenleri yerelde de işaretleyip yeni listeyi döner. */
  const syncServer = useCallback(async (list: PriceAlarm[]): Promise<PriceAlarm[] | null> => {
    if (!alarmSyncDatasource.isEnabled()) return null;
    const payload = syncPayload(list);
    const signature = JSON.stringify(payload.map((a) => [a.id, a.direction, a.target]));
    if (signature === lastSynced.current) return null;
    const token = await notificationsDatasource.getPushToken();
    if (!token) return null;
    const result = await alarmSyncDatasource.sync(token, payload);
    if (!result) return null;
    lastSynced.current = signature;
    let next: PriceAlarm[] | null = null;
    for (const { id, at } of result.triggered) next = await alarmRepository.markTriggered([id], new Date(at));
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const saved = await alarmRepository.list();
        if (cancelled) return;
        setAlarms(saved);
        const updated = await syncServer(saved);
        if (!cancelled && updated) setAlarms(updated);
      } catch {
        // Kayıt okunamazsa alarm listesi boş başlar; eşitleme başarısızsa yalnızca cihazda çalışır.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncServer]);

  // Ekleme, silme, düzenleme ve yerel tetiklemeden sonra sunucu listesini güncel tutar.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void syncServer(alarms).then((updated) => {
      if (!cancelled && updated) setAlarms(updated);
    });
    return () => {
      cancelled = true;
    };
  }, [alarms, ready, syncServer]);

  useEffect(() => {
    if (!ready) return;
    const due = alarmRepository
      .due(alarms, (id) => alarmPriceOf(id, prices))
      .filter(({ alarm }) => !inFlight.current.has(alarm.id));
    if (!due.length) return;
    for (const { alarm } of due) inFlight.current.add(alarm.id);

    void (async () => {
      try {
        // Önce kalıcı olarak işaretlenir: uygulama bildirim sırasında kapansa da tekrar gönderilmez.
        setAlarms(await alarmRepository.markTriggered(due.map(({ alarm }) => alarm.id)));
        analyticsDatasource.track({ name: 'alarm_triggered', source: 'local' });
        void reach('alarm_triggered');
        for (const { alarm, price } of due) {
          const { title, body } = alarmMessage(alarm, price);
          const sent = await notificationsDatasource.present(title, body, '/');
          if (sent) continue;
          // react-native-web'de `Alert.alert` bir şey göstermez.
          if (Platform.OS === 'web') window.alert(`${title}\n${body}`);
          else Alert.alert(title, body);
        }
      } catch {
        // Kayıt başarısızsa alarm bekleyen kalır; bir sonraki fiyat güncellemesinde yeniden denenir.
      } finally {
        for (const { alarm } of due) inFlight.current.delete(alarm.id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarms, prices, ready]);

  const activeCount = alarms.filter((a) => !a.triggeredAt).length;
  const unseenCount = useCallback(
    (assetId?: string) => alarms.filter((a) => a.triggeredAt && !a.seenAt && (!assetId || a.assetId === assetId)).length,
    [alarms],
  );
  const markSeen = useCallback(async (assetId?: string) => {
    setAlarms(await alarmRepository.markSeen(assetId));
  }, []);
  const canAdd = isPremium || activeCount < FREE_ALARM_LIMIT;

  const addAlarm = useCallback(
    async (input: NewAlarmInput) => {
      if (!canAdd) {
        openPaywall('alarm');
        return false;
      }
      // İzin reddedilse de alarm kaydedilir; tetiklenince uygulama içi uyarı gösterilir.
      await notificationsDatasource.ensurePermission();
      setAlarms(await alarmRepository.add(input));
      return true;
    },
    [canAdd, openPaywall],
  );

  const removeAlarm = useCallback(async (id: string) => {
    setAlarms(await alarmRepository.remove(id));
  }, []);

  const updateAlarm = useCallback(async (id: string, patch: Pick<PriceAlarm, 'direction' | 'target'>) => {
    setAlarms(await alarmRepository.update(id, patch));
  }, []);

  const value = useMemo<AlarmContextValue>(
    () => ({
      alarms,
      activeCount,
      canAdd,
      notificationsAvailable: notificationsDatasource.isAvailable(),
      serverAlarms: alarmSyncDatasource.isEnabled(),
      unseenCount,
      markSeen,
      addAlarm,
      removeAlarm,
      updateAlarm,
    }),
    [alarms, activeCount, canAdd, unseenCount, markSeen, addAlarm, removeAlarm, updateAlarm],
  );

  return <AlarmContext.Provider value={value}>{children}</AlarmContext.Provider>;
}

export function useAlarms(): AlarmContextValue {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarms, AlarmProvider içinde kullanılmalı');
  return ctx;
}
