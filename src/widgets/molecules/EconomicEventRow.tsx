import { EVENT_COUNTRY_LABELS, EVENT_IMPACT_NOTES } from '@/src/core/constants/economicCalendar';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { EconomicEvent } from '@/src/domain/models';
import { AppText } from '@/src/widgets/atoms/AppText';
import { BellIcon } from '@/src/widgets/atoms/BellIcon';
import { FlagIcon } from '@/src/widgets/atoms/FlagIcon';
import React, { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const timeFormatter = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

type Props = {
  event: EconomicEvent;
  reminded: boolean;
  /** Verilmezse hatırlatma düğmesi gösterilmez (ör. web). */
  onToggleReminder?: (event: EconomicEvent) => void;
  /** Takvim ekranında olası etki notu da gösterilir (yalnızca yaklaşan olaylarda). */
  showNote?: boolean;
  first?: boolean;
  /** Açıklanmış olay: zil yerine açıklanan değer ya da "Bekleniyor" gösterilir. */
  past?: boolean;
  /** Verilirse satır dokunulabilir olur (ör. açıklanmış olayın raporu). */
  onPress?: (event: EconomicEvent) => void;
  /** Başlık sütununun altında (ör. "Analiz raporu" etiketi). */
  badge?: ReactNode;
};

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={color} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Takvim satırı: bayrak, olay adı, altında saat ve dönem. Yaklaşan olayda sağda hatırlatma düğmesi;
 * açıklanmış olayda sağda açıklanan değer ve önceki değer (ya da "Bekleniyor").
 */
export const EconomicEventRow = memo(function EconomicEventRow({
  event,
  reminded,
  onToggleReminder,
  showNote,
  first,
  past,
  onPress,
  badge,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const time = timeFormatter.format(new Date(event.at));
  const result = past ? event.result : undefined;
  const meta = [time, event.period].filter(Boolean).join(' · ');

  const rowStyle = [styles.row, !first && styles.divider];
  // Stil fonksiyonunu yalnızca Pressable kabul eder; View'a verilirse yok sayılır.
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress ? () => onPress(event) : undefined}
      style={onPress ? ({ pressed }: { pressed: boolean }) => [rowStyle, pressed && styles.pressed] : rowStyle}
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onPress ? 'Raporu açar' : undefined}
      accessibilityLabel={[
        `${EVENT_COUNTRY_LABELS[event.country]} ${event.title}`,
        meta,
        past ? (result ? `açıklandı ${result.value}` : 'sonuç bekleniyor') : null,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <View style={styles.flag}>
        <FlagIcon country={event.country} />
      </View>

      <View style={styles.text}>
        <AppText variant="body" style={styles.title} numberOfLines={1}>
          {event.title}
        </AppText>
        <AppText variant="caption" tone="tertiary" style={styles.meta} numberOfLines={1}>
          {meta}
        </AppText>
        {result?.detail ? (
          <AppText variant="caption" tone="secondary" numberOfLines={2}>
            {result.detail}
          </AppText>
        ) : null}

        {badge}
        {showNote && !past ? (
          <AppText variant="caption" tone="secondary" style={styles.note}>
            {EVENT_IMPACT_NOTES[event.country][event.kind]}
          </AppText>
        ) : null}
      </View>

      {past ? (
        result ? (
          <View style={styles.result}>
            <View style={styles.resultValueRow}>
              <CheckIcon color={colors.semantic.up} />
              <AppText variant="bodyStrong" style={styles.resultValue}>
                {result.value}
              </AppText>
            </View>
            {result.previous && result.previous !== result.value ? (
              <AppText variant="caption" tone="tertiary" style={styles.tabular}>
                {`önceki ${result.previous}`}
              </AppText>
            ) : null}
          </View>
        ) : (
          <View style={styles.pending}>
            <AppText variant="caption" tone="tertiary" style={styles.pendingText}>
              Bekleniyor
            </AppText>
          </View>
        )
      ) : onToggleReminder ? (
        <Pressable
          onPress={() => onToggleReminder(event)}
          style={[styles.bell, reminded && styles.bellOn]}
          hitSlop={6}
          accessibilityRole="switch"
          accessibilityState={{ checked: reminded }}
          accessibilityLabel={`${event.title} için hatırlatma`}
        >
          <BellIcon color={reminded ? colors.brand.goldDeep : colors.text.tertiary} filled={reminded} />
        </Pressable>
      ) : null}
      {onPress ? (
        <AppText variant="bodyStrong" tone="tertiary" style={styles.chevron}>
          ›
        </AppText>
      ) : null}
    </Container>
  );
});

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingVertical: 10,
    paddingHorizontal: paddings.sm,
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  flag: { alignSelf: 'flex-start', paddingTop: 3 },
  text: { flex: 1, gap: 1 },
  title: { fontWeight: '600' },
  meta: { fontVariant: ['tabular-nums'] },
  note: { marginTop: 4, lineHeight: 17 },
  result: { alignItems: 'flex-end', gap: 1 },
  resultValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultValue: { fontVariant: ['tabular-nums'] },
  tabular: { fontVariant: ['tabular-nums'] },
  pending: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.muted,
  },
  pendingText: { fontWeight: '600' },
  bell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  bellOn: { backgroundColor: colors.surface.goldTint },
  pressed: { opacity: 0.7 },
  chevron: { marginLeft: -4 },
}));
