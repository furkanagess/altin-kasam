import { useBreakpoint } from '@/src/core/theme/web';
import { WideColumns } from '@/src/widgets/molecules/WideColumns';
import { getGoldAsset } from '@/src/core/constants/goldAssets';
import { makeStyles, paddings } from '@/src/core/theme';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useCurrencySwitcher } from '@/src/viewmodels/market/useCurrencySwitcher';
import { useGoldRateChart } from '@/src/viewmodels/market/useGoldRateChart';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { CurrencySwitcher } from '@/src/widgets/molecules/CurrencySwitcher';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { PriceChart } from '@/src/widgets/organisms/PriceChart';
import { PriceStatsTable } from '@/src/widgets/organisms/PriceStatsTable';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { View } from 'react-native';

export default function GoldRateDetailScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const asset = getGoldAsset(id ?? '');
  const { displayGoldRates, currency, timeframes, lockedTimeframes } = useMarketViewModel();
  const currencySwitcher = useCurrencySwitcher();
  const { openPaywall } = useSubscription();
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);
  const chart = useGoldRateChart(asset?.id ?? '');
  const expanded = useBreakpoint() === 'expanded';

  if (!asset) {
    return (
      <Screen>
        <EmptyState title="Bulunamadı" message="Bu altın çeşidi artık listede yok." />
      </Screen>
    );
  }

  const rate = displayGoldRates.find((r) => r.assetId === asset.id);
  const sourceNote =
    chart.source === 'estimate'
      ? 'Bu çeşidin kendi fiyat geçmişi yok; grafik gram altının hareketinden, güncel fiyat oranıyla yaklaşık çizildi.'
      : null;

  const addButton = (
    <AppButton label="Ekle" onPress={() => router.push({ pathname: '/add-holding', params: { assetId: asset.id } })} />
  );

  // Masaüstünde grafik solda; fiyat tablosu ve "Ekle" sağda. Telefonda "Ekle" altta sabittir.
  return (
    <Screen scroll footer={expanded ? undefined : addButton}>
      <Stack.Screen options={{ title: asset.label }} />
      <WideColumns
        asideWidth={360}
        main={
          <>

            <PriceChart
              points={chart.points}
              currency={currency}
              livePrice={rate?.bid}
              timeframe={chart.timeframe}
              timeframes={timeframes}
              onTimeframeChange={chart.setTimeframe}
              lockedTimeframes={lockedTimeframes}
              onLockedTimeframe={onLockedTimeframe}
              loading={chart.loading}
              headerLeft={<GoldAssetIcon asset={asset} size={26} maxWidth={40} />}
              headerRight={
                <View style={styles.chartActions}>
                  <CurrencySwitcher {...currencySwitcher} compact />
                  <AlarmButton
                    assetId={asset.id}
                    onPress={() => router.push({ pathname: '/alarm', params: { assetId: asset.id } })}
                    accessibilityLabel={`${asset.label} için fiyat alarmı`}
                  />
                </View>
              }
              flashOnLiveChange
              height={expanded ? 320 : 240}
              bare
            />
            {sourceNote ? (
              <AppText variant="caption" tone="tertiary">
                {sourceNote}
              </AppText>
            ) : null}
          </>
        }
        aside={
          <>
            {rate ? <PriceStatsTable bid={rate.bid} ask={rate.ask} day={rate.day} currency={currency} /> : null}
            {expanded ? addButton : null}
          </>
        }
      />
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  chartActions: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
}));
