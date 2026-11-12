import {
  type Currency,
  type Timeframe,
} from '@/src/core/constants/app';
import { GOLD_ASSETS, goldAssetRowText } from '@/src/core/constants/goldAssets';
import { makeStyles, paddings, radii } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';
import {
  CHART_SYMBOLS,
  useMarketChart,
  useMarketViewModel,
  type ChartSymbol,
} from '@/src/viewmodels/market/MarketProvider';
import { useCurrencySwitcher } from '@/src/viewmodels/market/useCurrencySwitcher';
import { useMarketTicker } from '@/src/viewmodels/market/useMarketTicker';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { FullscreenButton } from '@/src/widgets/molecules/FullscreenButton';
import { METAL_ALARM_ASSET } from '@/src/core/constants/alarmAssets';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { Screen } from '@/src/widgets/atoms/Screen';
import { CurrencySwitcher } from '@/src/widgets/molecules/CurrencySwitcher';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { ExpandablePriceRow } from '@/src/widgets/molecules/ExpandablePriceRow';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { TopTabs } from '@/src/widgets/molecules/TopTabs';
import { MarketTicker } from '@/src/widgets/organisms/MarketTicker';
import { InfoSheet } from '@/src/widgets/organisms/InfoSheet';
import { InfoButton } from '@/src/widgets/molecules/InfoButton';
import { MARKET_INFO, type MarketInfoId } from '@/src/core/constants/marketInfo';
import { PriceChart } from '@/src/widgets/organisms/PriceChart';
import { router, useLocalSearchParams } from 'expo-router';
import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView as RNScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

const EMPTY_POINTS: CandlePoint[] = [];
/** `ExpandablePriceRow` ikon alanının genişliği. */
const ROW_ICON_WIDTH = 40;
/** Satırlar memo'lu; sabit ikon öğeleri fiyat tiklerinde değişmeyen satırların çizimini atlatır. */
const GOLD_ICONS: Record<string, ReactNode> = Object.fromEntries(
  GOLD_ASSETS.map((asset) => [
    asset.id,
    <GoldAssetIcon key={asset.id} asset={asset} size={27} maxWidth={ROW_ICON_WIDTH} />,
  ]),
);

const GOLD_ROW_TEXT = Object.fromEntries(GOLD_ASSETS.map((asset) => [asset.id, goldAssetRowText(asset)]));

type ChartPageProps = {
  symbol: ChartSymbol;
  width: number;
  points: CandlePoint[] | undefined;
  loading: boolean;
  livePrice: number | undefined;
  currency: Currency;
  timeframe: Timeframe;
  timeframes: readonly Timeframe[];
  lockedTimeframes: readonly Timeframe[];
  onTimeframeChange: (tf: Timeframe) => void;
  onLockedTimeframe: () => void;
  currencySwitcher: ReturnType<typeof useCurrencySwitcher>;
};

/** Yalnızca kendi metalinin verisi değişince çizilir; diğer sayfanın yüklemesi ve kaydırma etkilemez. */
const ChartPage = memo(function ChartPage({
  symbol,
  width,
  points,
  loading,
  livePrice,
  currency,
  timeframe,
  timeframes,
  lockedTimeframes,
  onTimeframeChange,
  onLockedTimeframe,
  currencySwitcher,
}: ChartPageProps) {
  const styles = useStyles();
  return (
    <View style={[styles.page, { width }]}>
      <PriceChart
        hideTimestamp
        points={points ?? EMPTY_POINTS}
        currency={currency}
        livePrice={livePrice}
        timeframe={timeframe}
        timeframes={timeframes}
        onTimeframeChange={onTimeframeChange}
        lockedTimeframes={lockedTimeframes}
        onLockedTimeframe={onLockedTimeframe}
        loading={loading}
        headerLeft={<MetalIcon symbol={symbol} />}
        headerRight={
          <View style={styles.chartActions}>
            <CurrencySwitcher {...currencySwitcher} compact />
            <AlarmButton
              assetId={METAL_ALARM_ASSET[symbol]}
              onPress={() => openAlarm(METAL_ALARM_ASSET[symbol])}
              accessibilityLabel={`${PAGE_NAMES[symbol]} için fiyat alarmı`}
            />
            <FullscreenButton
              onPress={() => router.push({ pathname: '/metal/[symbol]', params: { symbol } })}
              accessibilityLabel={`${PAGE_NAMES[symbol]} detayı`}
            />
          </View>
        }
        flashOnLiveChange
        bare
      />
    </View>
  );
});

const openAddHolding = (assetId: string) => router.push({ pathname: '/add-holding', params: { assetId } });
const openAlarm = (assetId: string) => router.push({ pathname: '/alarm', params: { assetId } });
const openDetail = (id: string) => router.push({ pathname: '/gold/[id]', params: { id } });

const PAGE_NAMES: Record<ChartSymbol, string> = {
  [MetalSymbol.XAU]: 'Altın',
  [MetalSymbol.XAG]: 'Gümüş',
  [MetalSymbol.XPT]: 'Platin',
  [MetalSymbol.XPD]: 'Paladyum',
};

const CHART_TABS = CHART_SYMBOLS.map((symbol) => ({ id: symbol, label: PAGE_NAMES[symbol] }));

/** Metal grafikleri yan yana sayfalardır; hepsinin verisi hazır tutulur. */
function MarketChartSection() {
  const styles = useStyles();
  const { displayQuotes, currency, timeframes, lockedTimeframes } = useMarketViewModel();
  const { timeframe, setTimeframe, charts, chartLoading } = useMarketChart();
  const currencySwitcher = useCurrencySwitcher();
  const { openPaywall } = useSubscription();
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);

  const pagerRef = useRef<ComponentRef<typeof RNScrollView>>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);

  // Seçili sekme sayfa yerine oturunca güncellenir; kaydırma sırasında yeniden çizim olmaz.
  const settle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pageWidth) return;
      const x = e.nativeEvent.contentOffset.x;
      const index = Math.round(x / pageWidth);
      if (Math.abs(x - index * pageWidth) > 1) return;
      const next = Math.min(CHART_SYMBOLS.length - 1, Math.max(0, index));
      if (next === pageRef.current) return;
      pageRef.current = next;
      setPage(next);
    },
    [pageWidth],
  );

  const goTo = (index: number) => {
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
    pageRef.current = index;
    setPage(index);
  };

  // Başka ekrandan (ör. fiyat şeridinden) belirli bir metal istendiyse o sayfaya kaydırılır; sekme
  // durumu kaydırma olayında (`settle`) güncellenir.
  const { metal, at } = useLocalSearchParams<{ metal?: string; at?: string }>();
  useEffect(() => {
    const index = CHART_SYMBOLS.indexOf(metal as ChartSymbol);
    if (index < 0 || !pageWidth) return;
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  }, [metal, at, pageWidth]);

  return (
    <View style={styles.chartSection}>

      <TopTabs
        tabs={CHART_TABS}
        value={CHART_SYMBOLS[page]}
        onChange={(symbol) => goTo(CHART_SYMBOLS.indexOf(symbol))}
        style={styles.chartTabs}
      />

      <View style={styles.pager}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width === pageWidth) return;
            setPageWidth(width);
            pagerRef.current?.scrollTo({ x: pageRef.current * width, animated: false });
          }}
          onScroll={settle}
          onMomentumScrollEnd={settle}
        >
          {CHART_SYMBOLS.map((symbol) => (
            <ChartPage
              key={symbol}
            symbol={symbol}
            width={pageWidth}
              points={charts[symbol]?.points}
              loading={chartLoading[symbol]}
              livePrice={displayQuotes.find((q) => q.symbol === symbol)?.bid}
              currency={currency}
              timeframe={timeframe}
              timeframes={timeframes}
              lockedTimeframes={lockedTimeframes}
              onTimeframeChange={setTimeframe}
              onLockedTimeframe={onLockedTimeframe}
              currencySwitcher={currencySwitcher}
            />
          ))}
        </ScrollView>
      </View>

    </View>
  );
}

export default function MarketScreen() {
  const styles = useStyles();
  const { state, error, displayGoldRates: goldRates, currency, refresh } = useMarketViewModel();
  const ticker = useMarketTicker();
  const [info, setInfo] = useState<MarketInfoId | null>(null);
  // Listede aynı anda tek satır açık: başka satıra dokununca önceki kapanır.
  const [openGoldId, setOpenGoldId] = useState<string | null>(null);
  const toggleGold = useCallback((id: string) => setOpenGoldId((current) => (current === id ? null : id)), []);

  const goldProducts = GOLD_ASSETS.flatMap((asset) => {
    const rate = goldRates.find((r) => r.assetId === asset.id);
    return rate ? [{ asset, rate }] : [];
  });
  return (
    <View style={styles.root}>
      <MarketTicker items={ticker} />
      <Screen scroll onRefresh={() => void refresh()} refreshing={state === 'loading'}>
        <MarketChartSection />

        {state === 'error' ? (
          <EmptyState
            title="Piyasa alınamadı"
            message={error ?? 'Bilinmeyen hata'}
            actionLabel="Yenile"
            onAction={() => void refresh()}
          />
        ) : null}

        <Pressable
          style={styles.widgetEntry}
          onPress={() => router.push('/widget')}
          accessibilityRole="button"
          accessibilityLabel="Ana ekran widget’ı, Pro"
        >
          <View style={styles.widgetEntryText}>
            <View style={styles.widgetEntryTitle}>
              <AppText variant="bodyStrong">Ana ekran widget’ı</AppText>
              <ProMark />
            </View>
            <AppText variant="caption" tone="secondary">
              Seçtiğin birimin fiyatı telefonunun ana ekranında
            </AppText>
          </View>
          <AppText variant="bodyStrong" tone="gold">›</AppText>
        </Pressable>

        {goldProducts.length ? (
          <>
            <SectionHeader
              title="Altın çeşitleri"
              right={<InfoButton label="Altın çeşitleri nedir?" onPress={() => setInfo('goldTypes')} />}
            />
            <View style={styles.list}>
              {goldProducts.map(({ asset, rate }) => (
                <ExpandablePriceRow
                  key={asset.id}
                  name={GOLD_ROW_TEXT[asset.id].title}
                  caption={GOLD_ROW_TEXT[asset.id].meta}
                  bid={rate.bid}
                  ask={rate.ask}
                  currency={currency}
                  day={rate.day}
                  id={asset.id}
                  onAdd={openAddHolding}
                  onAlarm={openAlarm}
                  onDetail={openDetail}
                  expanded={openGoldId === asset.id}
                  onToggle={toggleGold}
                  icon={GOLD_ICONS[asset.id]}
                />
              ))}
            </View>
          </>
        ) : null}
      </Screen>
      {info ? <InfoSheet visible {...MARKET_INFO[info]} onClose={() => setInfo(null)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  chartSection: { gap: paddings.sm },
  flex: { flex: 1 },
  // Sayfalar ekran kenarına kadar kayar; her sayfa kendi kenar boşluğunu taşır.
  chartTabs: { marginHorizontal: -paddings.screen },
  pager: { marginHorizontal: -paddings.screen },
  page: { paddingHorizontal: paddings.screen },
  chartActions: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  list: {
    marginHorizontal: -(paddings.screen - paddings.xs),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  widgetEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  widgetEntryText: { flex: 1, gap: 2 },
  widgetEntryTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
