import { EVENT_REMINDER_LEAD_MINUTES } from '@/src/core/constants/economicCalendar';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { EconomicEvent } from '@/src/domain/models';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { FlagIcon } from '@/src/widgets/atoms/FlagIcon';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

type Props = {
  upcoming: EconomicEvent[];
  /** Açıklanmış ve raporu hazır olay sayısı. */
  reportCount: number;
  onPress: () => void;
  now: number;
};

function Check() {
  const { colors } = useTheme();
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={colors.brand.goldDeep} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Pro olmayan kullanıcıya yaklaşan takvimin yerine: sıradaki olay açıkça görünür, ayrıntılar ve
 * tüm liste Pro’dadır. Somut sayılar (olay ve rapor) neyin açılacağını gösterir.
 */
export function CalendarPremiumTeaser({ upcoming, reportCount, onPress, now }: Props) {
  const styles = useStyles();
  const next = upcoming[0];
  const days = next ? Math.max(0, Math.ceil((Date.parse(next.at) - now) / 86_400_000)) : 0;
  const rates = upcoming.filter((e) => e.kind === 'rate').length;
  const benefits = [
    `${upcoming.length} yaklaşan açıklama: ${rates} faiz kararı, ${upcoming.length - rates} enflasyon ve istihdam verisi`,
    `Açıklamadan ${EVENT_REMINDER_LEAD_MINUTES} dakika önce hatırlatma bildirimi`,
    'Her olayın altın ve gümüşe olası etkisi',
    reportCount
      ? `Açıklanan her karar için analiz raporu: piyasa tepkisi, metnin tonu, oy dağılımı · ${reportCount} rapor hazır`
      : 'Açıklanan her karar için analiz raporu: piyasa tepkisi, metnin tonu, oy dağılımı',
  ];

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <AppText variant="h3" style={styles.flex}>
          Yaklaşan takvim
        </AppText>
        <ProMark />
      </View>

      {next ? (
        <View style={styles.next}>
          <FlagIcon country={next.country} />
          <View style={styles.flex}>
            <AppText variant="caption" tone="tertiary">
              {days === 0 ? 'SIRADAKİ · BUGÜN' : days === 1 ? 'SIRADAKİ · YARIN' : `SIRADAKİ · ${days} GÜN SONRA`}
            </AppText>
            <AppText variant="bodyStrong">{next.title}</AppText>
            <AppText variant="caption" tone="secondary">
              {[dateFormatter.format(new Date(next.at)), next.period].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={styles.benefits}>
        {benefits.map((text) => (
          <View key={text} style={styles.benefit}>
            <Check />
            <AppText variant="body" style={styles.flex}>
              {text}
            </AppText>
          </View>
        ))}
      </View>

      <AppButton label="Pro’yu incele" onPress={onPress} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  card: {
    gap: paddings.md,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  next: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: paddings.sm,
    padding: paddings.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface.elevated,
  },
  benefits: { gap: 10 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: paddings.sm },
}));
