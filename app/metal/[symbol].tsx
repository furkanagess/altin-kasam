import { METAL_ALARM_ASSET } from '@/src/core/constants/alarmAssets';
import { makeStyles, paddings } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import {
  CHART_SYMBOLS,
  useMarketChart,
  useMarketViewModel,
  type ChartSymbol,
} from '@/src/viewmodels/market/MarketProvider';
import { useCurrencySwitcher } from '@/src/viewmodels/market/useCurrencySwitcher';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { CurrencySwitcher } from '@/src/widgets/molecules/CurrencySwitcher';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { PriceChart } from '@/src/widgets/organisms/PriceChart';
import { PriceStatsTable } from '@/src/widgets/organisms/PriceStatsTable';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { View } from 'react-native';

/** Fiyatlar gram başınadır; altında 24 ayar. */
const TITLES: Record<ChartSymbol, string> = {
  [MetalSymbol.XAU]: 'Gram Altın (24 ayar)',
  [MetalSymbol.XAG]: 'Gram Gümüş',
  [MetalSymbol.XPT]: 'Gram Platin',
  [MetalSymbol.XPD]: 'Gram Paladyum',
};

const EMPTY_POINTS: never[] = [];

/** Piyasa ekranındaki metal grafiğinin detayı: büyük grafik, fiyat tablosu, ekle ve alarm. */
export default function MetalDetailScreen() {
  const styles = useStyles();
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = CHART_SYMBOLS.find((s) => s === raw);
  const { displayQuotes, currency, timeframes, lockedTimeframes } = useMarketViewModel();
  // Periyot Piyasa ekranındaki grafiklerle ortaktır; aynı seri yeniden indirilmez.
  const { timeframe, setTimeframe, charts, chartLoading } = useMarketChart();
  const currencySwitcher = useCurrencySwitcher();
  const { openPaywall } = useSubscription();
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);

  if (!symbol) {
    return (
      <Screen>
        <EmptyState title="Bulunamadı" message="Bu metal listede yok." />
      </Screen>
    );
  }

  const quote = displayQuotes.find((q) => q.symbol === symbol);
  const assetId = METAL_ALARM_ASSET[symbol];

  return (
    <Screen
      scroll
      footer={<AppButton label="Ekle" onPress={() => router.push({ pathname: '/add-holding', params: { assetId } })} />}
    >
      <Stack.Screen options={{ title: TITLES[symbol] }} />

      <PriceChart
        points={charts[symbol]?.points ?? EMPTY_POINTS}
        currency={currency}
        livePrice={quote?.bid}
        timeframe={timeframe}
        timeframes={timeframes}
        onTimeframeChange={setTimeframe}
        lockedTimeframes={lockedTimeframes}
        onLockedTimeframe={onLockedTimeframe}
        loading={chartLoading[symbol]}
        headerLeft={<MetalIcon symbol={symbol} />}
        headerRight={
          <View style={styles.chartActions}>
            <CurrencySwitcher {...currencySwitcher} compact />
            <AlarmButton
              assetId={assetId}
              onPress={() => router.push({ pathname: '/alarm', params: { assetId } })}
              accessibilityLabel={`${TITLES[symbol]} için fiyat alarmı`}
            />
          </View>
        }
        flashOnLiveChange
        height={240}
        bare
      />
      {quote ? <PriceStatsTable bid={quote.bid} ask={quote.ask} day={quote.day} currency={currency} /> : null}
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  chartActions: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
}));
