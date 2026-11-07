import type { Timeframe } from '@/src/core/constants/app';
import { colors } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import { formatPercent, formatTRY } from '@/src/utils/format';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { Screen } from '@/src/widgets/atoms/Screen';
import { HashtagChip } from '@/src/widgets/molecules/HashtagChip';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { SparklineChart } from '@/src/widgets/organisms/SparklineChart';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

export default function AssetDetailScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const {
    quotes,
    selectedSymbol,
    setSelectedSymbol,
    timeframe,
    setTimeframe,
    timeframes,
    chart,
  } = useMarketViewModel();

  useEffect(() => {
    if (symbol && Object.values(MetalSymbol).includes(symbol as MetalSymbol)) {
      setSelectedSymbol(symbol as MetalSymbol);
    }
  }, [symbol, setSelectedSymbol]);

  const quote = quotes.find((q) => q.symbol === (symbol as MetalSymbol)) ??
    quotes.find((q) => q.symbol === selectedSymbol);

  if (!quote) {
    return (
      <Screen>
        <AppText>Varlık bulunamadı</AppText>
      </Screen>
    );
  }

  const up = quote.changePercent >= 0;

  return (
    <Screen scroll>
      <SectionHeader title={quote.name} subtitle={`${quote.symbol} · ${quote.unit}`} />
      <View style={styles.priceBlock}>
        <AppText variant="price">{formatTRY(quote.bid)}</AppText>
        <Badge label={formatPercent(quote.changePercent)} tone={up ? 'up' : 'down'} />
        <AppText variant="caption" tone="secondary">
          Alış {formatTRY(quote.ask)}
        </AppText>
      </View>

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

      <SparklineChart points={chart?.points ?? []} label={`${quote.symbol} grafiği`} />

      <View style={styles.note}>
        <AppText variant="caption" tone="secondary">
          Fiyatlar mock canlı akıştan gelir. Gerçek API bağlandığında aynı
          MarketRepository arkasından beslenir.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  priceBlock: { gap: 8 },
  tfRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface.muted,
  },
});
