import { useBreakpoint } from '@/src/core/theme/web';
import { WideColumns } from '@/src/widgets/molecules/WideColumns';
import { METAL_ALARM_ASSET, OUNCE_ALARM_ASSET } from '@/src/core/constants/alarmAssets';
import { makeStyles, paddings } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import {
  METAL_CHART_SYMBOLS,
  useMarketChart,
  useMarketViewModel,
  type MetalChartSymbol,
} from '@/src/viewmodels/market/MarketProvider';
import { useChartCurrencySwitcher } from '@/src/viewmodels/market/useCurrencySwitcher';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { CurrencySwitcher } from '@/src/widgets/molecules/CurrencySwitcher';
import { UnitSwitcher } from '@/src/widgets/molecules/UnitSwitcher';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { PriceChart } from '@/src/widgets/organisms/PriceChart';
import { PriceStatsTable } from '@/src/widgets/organisms/PriceStatsTable';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { View } from 'react-native';

/** Fiyatlar gram başınadır; altında 24 ayar. */
const TITLES: Record<MetalChartSymbol, string> = {
  [MetalSymbol.XAU]: 'Gram Altın (24 ayar)',
  [MetalSymbol.XAG]: 'Gram Gümüş',
};

const OUNCE_TITLES: Record<MetalChartSymbol, string> = {
  [MetalSymbol.XAU]: 'Ons Altın',
  [MetalSymbol.XAG]: 'Ons Gümüş',
};

const EMPTY_POINTS: never[] = [];

/** Piyasa ekranındaki metal grafiğinin detayı: büyük grafik, fiyat tablosu, ekle ve alarm. */
export default function MetalDetailScreen() {
  const styles = useStyles();
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = METAL_CHART_SYMBOLS.find((s) => s === raw);
  const { displayQuotes, displayOunceQuotes, timeframes, lockedTimeframes } = useMarketViewModel();
  // Periyot Piyasa ekranındaki grafiklerle ortaktır; aynı seri yeniden indirilmez.
  const { timeframe, setTimeframe, unit, setUnit, chartCurrency: currency, charts, chartLoading } = useMarketChart();
  const currencySwitcher = useChartCurrencySwitcher();
  const { openPaywall } = useSubscription();
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);
  const expanded = useBreakpoint() === 'expanded';

  if (!symbol) {
    return (
      <Screen>
        <EmptyState title="Bulunamadı" message="Bu metal listede yok." />
      </Screen>
    );
  }

  const ounce = unit === 'ounce';
  const quote = (ounce ? displayOunceQuotes : displayQuotes).find((q) => q.symbol === symbol);
  // Alarm da birime uyar: gramda TL gram fiyatı, onsta USD ons fiyatı. "Ekle" (kasa) her zaman gramdır.
  const holdingAssetId = METAL_ALARM_ASSET[symbol];
  const assetId = ounce ? OUNCE_ALARM_ASSET[symbol] : holdingAssetId;

  const addButton = (
    <AppButton label="Ekle" onPress={() => router.push({ pathname: '/add-holding', params: { assetId: holdingAssetId } })} />
  );

  // Masaüstünde grafik solda; fiyat tablosu ve "Ekle" sağda. Telefonda "Ekle" altta sabittir.
  return (
    <Screen scroll footer={expanded ? undefined : addButton}>
      <Stack.Screen options={{ title: ounce ? OUNCE_TITLES[symbol] : TITLES[symbol] }} />
      <WideColumns
        asideWidth={360}
        main={
          <>
            <View style={styles.unitRow}>
              <UnitSwitcher value={unit} onChange={setUnit} />
            </View>

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
                    accessibilityLabel={`${ounce ? OUNCE_TITLES[symbol] : TITLES[symbol]} için fiyat alarmı`}
                  />
                </View>
              }
              flashOnLiveChange
              flashKey={`${currency}-${unit}`}
              height={expanded ? 320 : 240}
              bare
            />
          </>
        }
        aside={
          <>
            {quote ? <PriceStatsTable bid={quote.bid} ask={quote.ask} day={quote.day} currency={currency} /> : null}
            {expanded ? addButton : null}
          </>
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles(() => ({
  unitRow: { alignItems: 'flex-end' },
  chartActions: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
}));
