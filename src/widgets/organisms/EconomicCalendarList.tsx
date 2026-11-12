import { makeStyles, radii } from '@/src/core/theme';
import type { EconomicEvent } from '@/src/domain/models';
import { AppText } from '@/src/widgets/atoms/AppText';
import { EconomicEventRow } from '@/src/widgets/molecules/EconomicEventRow';
import React, { useState, type ReactNode } from 'react';
import { View } from 'react-native';

const ZONE = 'Europe/Istanbul';
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE });
const dayFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: ZONE });

type Props = {
  events: EconomicEvent[];
  reminders: ReadonlySet<string>;
  onToggleReminder?: (event: EconomicEvent) => void;
  showNotes?: boolean;
  now?: number;
  /** Açıklanmış olaylar listesi; günler "Dün" ya da tarihle etiketlenir, sonuçlar gösterilir. */
  past?: boolean;
  /** Satıra dokununca (ör. rapor ekranı). */
  onOpen?: (event: EconomicEvent) => void;
  /** Satır başına etiket (ör. raporu hazır olaylarda "Analiz raporu"). */
  badgeFor?: (event: EconomicEvent) => ReactNode;
};

/** Türkiye takvimine göre iki gün arasındaki tam gün farkı (saatten bağımsız). */
function dayDiff(at: string, now: number): number {
  const day = (t: number) => Date.parse(`${dayKeyFormatter.format(t)}T00:00:00Z`);
  return Math.round((day(Date.parse(at)) - day(now)) / 86_400_000);
}

function dayLabel(at: string, now: number): string {
  const diff = dayDiff(at, now);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Yarın';
  if (diff === -1) return 'Dün';
  const date = dayFormatter.format(new Date(at));
  return diff > 0 ? `${date} · ${diff} gün sonra` : `${date} · ${-diff} gün önce`;
}

/** Olaylar Türkiye saatine göre gün gün gruplanır; her gün ayrı kart. */
export function EconomicCalendarList({
  events,
  reminders,
  onToggleReminder,
  showNotes,
  now: nowProp,
  past,
  onOpen,
  badgeFor,
}: Props) {
  const styles = useStyles();
  const [mountedAt] = useState(() => Date.now());
  const now = nowProp ?? mountedAt;
  const days: { key: string; label: string; events: EconomicEvent[] }[] = [];
  for (const event of events) {
    const key = dayKeyFormatter.format(new Date(event.at));
    const last = days[days.length - 1];
    if (last?.key === key) last.events.push(event);
    else days.push({ key, label: dayLabel(event.at, now), events: [event] });
  }

  return (
    <View style={styles.list}>
      {days.map((day) => (
        <View key={day.key} style={styles.day}>
          <AppText variant="caption" tone="tertiary" style={styles.dayLabel}>
            {day.label.toLocaleUpperCase('tr-TR')}
          </AppText>
          <View style={[styles.card, past && styles.cardPast]}>
            {day.events.map((event, i) => (
              <EconomicEventRow
                key={event.id}
                event={event}
                reminded={reminders.has(event.id)}
                onToggleReminder={onToggleReminder}
                showNote={showNotes && !past}
                first={i === 0}
                past={past}
                onPress={onOpen}
                badge={badgeFor?.(event)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { gap: 12 },
  day: { gap: 6 },
  dayLabel: { letterSpacing: 0.6, fontWeight: '700', paddingLeft: 2 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  // Açıklanmış olaylar arka plana çekilir; yaklaşanlar beyaz kartta öne çıkar.
  cardPast: { backgroundColor: colors.surface.canvas },
}));
