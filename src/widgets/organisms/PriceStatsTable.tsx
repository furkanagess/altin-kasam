import type { Currency } from '@/src/core/constants/app';
import { makeStyles, paddings } from '@/src/core/theme';
import type { DayRange } from '@/src/domain/models';
import { formatMoney } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { StyleSheet, View } from 'react-native';

function Cell({ label, value, tone, right }: { label: string; value: string; tone?: 'down'; right?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.cell, right && styles.cellRight]}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tone={tone} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

/** Detay ekranlarındaki alış, satış, fark ve günlük istatistik tablosu; kart yerine ince çizgiler. */
export function PriceStatsTable({
  bid,
  ask,
  day,
  currency,
}: {
  bid: number;
  ask: number;
  day?: DayRange;
  currency: Currency;
}) {
  const styles = useStyles();
  const money = (v: number) => formatMoney(v, currency);
  return (
    <View style={styles.grid}>
      <Cell label="Alış" value={money(bid)} />
      <Cell right label="Satış" value={money(ask)} />
      <Cell label="Fark" value={money(ask - bid)} tone="down" />
      {day ? <Cell right label="Dünkü kapanış" value={money(day.previousClose)} /> : null}
      {day ? <Cell label="Günün en düşüğü" value={money(day.low)} /> : null}
      {day ? <Cell right label="Günün en yükseği" value={money(day.high)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  cell: {
    width: '50%',
    gap: 2,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  cellRight: { paddingLeft: paddings.md },
}));
