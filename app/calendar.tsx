import { EVENT_REMINDER_LEAD_MINUTES } from '@/src/core/constants/economicCalendar';
import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { useEconomicCalendar } from '@/src/viewmodels/analysis/EconomicCalendarProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { PremiumLock } from '@/src/widgets/molecules/PremiumLock';
import { ReportBadge } from '@/src/widgets/molecules/ReportBadge';
import { CalendarPremiumTeaser } from '@/src/widgets/organisms/CalendarPremiumTeaser';
import type { EconomicEvent } from '@/src/domain/models';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { router } from 'expo-router';
import { EconomicCalendarList } from '@/src/widgets/organisms/EconomicCalendarList';
import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

const FOOTNOTES = [
  'Tüm saatler Türkiye saatidir.',
  'Açıklanan sonuçlar yayımlandıktan sonra, genellikle birkaç saat içinde burada görünür.',
  'Etki notları genel eğilimleri anlatır; yatırım tavsiyesi değildir.',
];

/** Yaklaşan tüm faiz kararları ve veri açıklamaları, olası etkileriyle. */
export default function EconomicCalendarScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { events, recent, loading, error, reminders, remindersAvailable, toggleReminder, refresh } =
    useEconomicCalendar();
  const [refreshing, setRefreshing] = useState(false);
  const { isPremium, openPaywall } = useSubscription();
  const openReport = (event: EconomicEvent) =>
    router.push({ pathname: '/economic-event/[id]', params: { id: event.id } });
  const reportBadge = (event: EconomicEvent) => (event.result ? <ReportBadge /> : null);
  const [openedAt] = useState(() => Date.now());
  // Zil yalnızca Pro'da ve bildirim desteklenen platformda görünür; açıklaması da öyle.
  const footnotes =
    remindersAvailable && isPremium
      ? [
          FOOTNOTES[0],
          `Zil simgesine dokunursan açıklamadan ${EVENT_REMINDER_LEAD_MINUTES} dakika önce bildirim gelir.`,
          ...FOOTNOTES.slice(1),
        ]
      : FOOTNOTES;

  return (
    <Screen
      scroll
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void refresh().finally(() => setRefreshing(false));
      }}
    >
      {recent.length ? (
        <>
          <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
            SON AÇIKLANANLAR
          </AppText>
          <EconomicCalendarList events={recent} reminders={reminders} past onOpen={openReport} badgeFor={reportBadge} />
          <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>
            YAKLAŞAN
          </AppText>
        </>
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : events.length ? (
        isPremium ? (
          <EconomicCalendarList
            events={events}
            reminders={reminders}
            onToggleReminder={remindersAvailable ? (e) => void toggleReminder(e) : undefined}
            showNotes
          />
        ) : (
          <>
            <CalendarPremiumTeaser
              upcoming={events}
              reportCount={recent.filter((e) => e.result).length}
              onPress={() => openPaywall('calendar')}
              now={openedAt}
            />
            {/* Sıradakinden sonraki olayların bulanık önizlemesi: listenin dolu olduğu görünür. */}
            <PremiumLock
              locked
              onLockedPress={() => openPaywall('calendar')}
              label={`${Math.max(events.length - 1, 0)} olay daha · Pro`}
              accessibilityLabel="Yaklaşan ekonomik takvim"
            >
              <EconomicCalendarList events={events.slice(1, 4)} reminders={reminders} showNotes />
            </PremiumLock>
          </>
        )
      ) : error ? (
        <EmptyState
          title="Takvim alınamadı"
          message="Kurum takvimlerine şu an ulaşılamıyor. Biraz sonra tekrar dene."
          actionLabel="Tekrar dene"
          onAction={() => void refresh()}
        />
      ) : (
        <EmptyState
          title="Yaklaşan olay yok"
          message="Kurumlar yeni dönemin takvimini duyurunca burada listelenir."
        />
      )}
      <View style={styles.notes}>
        {footnotes.map((note) => (
          <View key={note} style={styles.noteRow}>
            <View style={styles.noteDot} />
            <AppText variant="caption" tone="tertiary" style={styles.noteText}>
              {note}
            </AppText>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  notes: { gap: 6, paddingTop: paddings.xs },
  noteRow: { flexDirection: 'row', gap: paddings.xs },
  noteDot: { width: 4, height: 4, marginTop: 7, borderRadius: 2, backgroundColor: colors.text.tertiary },
  noteText: { flex: 1, lineHeight: 17 },
  sectionTitle: { letterSpacing: 0.6, fontWeight: '700', marginBottom: -6 },
}));
