import { makeStyles, useTheme } from '@/src/core/theme';
import { formatPercent, formatSignedMoney } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import type { PortfolioSnapshot } from '@/src/domain/models';
import type { PortfolioChart } from '@/src/viewmodels/portfolio/usePortfolioChart';
import { TabIcon } from '@/src/widgets/atoms/TabIcon';
import { CHANGE_LABEL_WIDTH, PriceChart } from '@/src/widgets/organisms/PriceChart';
import React, { type ReactNode } from 'react';
import { View } from 'react-native';

type Props = {
  snapshot: PortfolioSnapshot;
  chart: PortfolioChart;
  onLockedTimeframe: () => void;
  /** Toplam değerin sağında (örn. para birimi seçici). */
  headerRight?: ReactNode;
  /** Kartın en üstünde (ör. "Toplam varlık"). */
  title?: string;
  /** Başlığın sağında (ör. tam ekran düğmesi). */
  titleRight?: ReactNode;
  height?: number;
  /** Kart çerçevesi olmadan (bkz. `PriceChart` `bare`). */
  bare?: boolean;
};

/** Emtia grafiğiyle aynı düzende toplam varlık grafiği. */
export function PortfolioChartCard({
  snapshot,
  chart,
  onLockedTimeframe,
  headerRight,
  title,
  titleRight,
  height = 180,
  bare,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <PriceChart
      points={chart.points}
      currency={snapshot.currency}
      livePrice={snapshot.totalValue}
      timeframe={chart.timeframe}
      timeframes={chart.timeframes}
      onTimeframeChange={chart.setTimeframe}
      lockedTimeframes={chart.lockedTimeframes}
      onLockedTimeframe={onLockedTimeframe}
      loading={chart.loading}
      height={height}
      bare={bare}
      headerLeft={
        <View style={styles.icon}>
          <TabIcon name="portfolio" color={colors.brand.goldDeep} focused />
        </View>
      }
      headerRight={headerRight}
      title={title}
      titleRight={titleRight}
      // Değişim, dönem başına değil o ana kadar yatırılan tutara göre: kâr/zarar.
      baseline={chart.cost}
      changeLabel="Toplam"
      changeExtra={
        <View style={styles.day}>
          <AppText variant="caption" tone="secondary" style={styles.dayLabel}>
            Bugün
          </AppText>
          <AppText variant="caption" tone={snapshot.dayPnl >= 0 ? 'up' : 'down'} style={styles.dayValue}>
            {formatSignedMoney(snapshot.dayPnl, snapshot.currency)} ({formatPercent(snapshot.dayPnlPercent)})
          </AppText>
        </View>
      }
      // Eksen periyodun tamamı: 1G'de son 24 saat; varlık sonradan eklendiyse çizgi o andan başlar.
      fullPeriod
    />
  );
}

const useStyles = makeStyles((colors) => ({
  day: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  dayLabel: { minWidth: CHANGE_LABEL_WIDTH },
  dayValue: { fontWeight: '600' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldBadge,
  },
}));
