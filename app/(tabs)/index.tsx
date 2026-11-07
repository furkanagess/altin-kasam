import type { Timeframe } from '@/src/core/constants/app';
import { colors, paddings, radii } from '@/src/core/theme';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { BrandHeader } from '@/src/widgets/molecules/BrandHeader';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { PriceRow } from '@/src/widgets/molecules/PriceRow';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { SparklineChart } from '@/src/widgets/organisms/SparklineChart';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

export default function MarketScreen() {
  const {
    state,
    error,
    quotes,
    selectedSymbol,
    setSelectedSymbol,
    timeframe,
    setTimeframe,
    timeframes,
    chart,
    snapshot,
    refresh,
  } = useMarketViewModel();

  const selected = quotes.find((q) => q.symbol === selectedSymbol);

  return (
    <Screen scroll onRefresh={() => void refresh()} refreshing={state === 'loading'}>
      <BrandHeader live={state === 'ready'} stale={snapshot?.stale} />

      <SectionHeader
        title="Canlı fiyatlar"
        subtitle="Altın, gümüş, bakır, platin ve petrol — mock canlı akış"
      />

      {state === 'loading' && !quotes.length ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : null}

      {state === 'error' ? (
        <EmptyState
          title="Piyasa alınamadı"
          message={error ?? 'Bilinmeyen hata'}
          actionLabel="Yenile"
          onAction={() => void refresh()}
        />
      ) : null}

      <View style={styles.list}>
        {quotes.map((q) => (
          <PriceRow
            key={q.symbol}
            quote={q}
            selected={q.symbol === selectedSymbol}
            onPress={() => {
              setSelectedSymbol(q.symbol);
              router.push(`/asset/${q.symbol}`);
            }}
          />
        ))}
      </View>

      <SectionHeader
        title={selected?.name ?? 'Grafik'}
        subtitle="Zaman aralığı seçin"
      />

      <View style={styles.tfRow}>
        {timeframes.map((tf) => (
          <HashtagChip
            key={tf}
            label={tf}
            active={timeframe === tf}
            onPress={() => setTimeframe(tf as Timeframe)}
          />
        ))}
      </View>

      <SparklineChart
        points={chart?.points ?? []}
        label={`${selectedSymbol} · ${timeframe}`}
      />

      <Pressable
        style={styles.hint}
        onPress={() => router.push(`/asset/${selectedSymbol}`)}
      >
        <AppText variant="caption" tone="gold">
          Detay ekranına git →
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  tfRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    alignSelf: 'flex-start',
    paddingVertical: paddings.xs,
    paddingHorizontal: paddings.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.brand.goldSoft,
  },
});
