import { colors, paddings, radii } from '@/src/core/theme';
import type { PortfolioSnapshot } from '@/src/domain/models';
import { formatPercent, formatTRY } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { SparklineChart } from '@/src/widgets/organisms/SparklineChart';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function PortfolioSummary({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const up = snapshot.pnl >= 0;
  return (
    <View style={styles.card}>
      <AppText variant="caption" tone="inverse">
        Toplam varlık
      </AppText>
      <AppText variant="price" tone="inverse">
        {formatTRY(snapshot.totalValue)}
      </AppText>
      <View style={styles.row}>
        <Badge
          label={`P&L ${formatPercent(snapshot.pnlPercent)}`}
          tone={up ? 'up' : 'down'}
        />
        <AppText variant="caption" tone="inverse">
          Maliyet {formatTRY(snapshot.totalCost)}
        </AppText>
      </View>
      <SparklineChart points={snapshot.series} height={120} label="Varlık eğilimi" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: paddings.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.inverse,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
