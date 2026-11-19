import { useWebElementWidth } from '@/src/core/hooks/useWebElementWidth';
import {
  type ChartUnit,
  type Currency,
  type Timeframe,
} from '@/src/core/constants/app';
import { GOLD_ASSETS, goldAssetRowText } from '@/src/core/constants/goldAssets';
import { makeStyles, paddings, radii } from '@/src/core/theme';
import { BRENT, MetalSymbol } from '@/src/domain/enums';
import type { CandlePoint } from '@/src/domain/models';
import {
  CHART_SYMBOLS,
  useMarketChart,
  useMarketViewModel,
  type ChartSymbol,
} from '@/src/viewmodels/market/MarketProvider';
import { useBrentCurrencySwitcher, useChartCurrencySwitcher } from '@/src/viewmodels/market/useCurrencySwitcher';
import { useMarketTicker } from '@/src/viewmodels/market/useMarketTicker';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { MetalIcon, OilIcon } from '@/src/widgets/atoms/MetalIcon';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { FullscreenButton } from '@/src/widgets/molecules/FullscreenButton';
import { METAL_ALARM_ASSET, OUNCE_ALARM_ASSET } from '@/src/core/constants/alarmAssets';
import { Screen } from '@/src/widgets/atoms/Screen';
import { TourTarget } from '@/src/widgets/atoms/TourTarget';
import { CurrencySwitcher } from '@/src/widgets/molecules/CurrencySwitcher';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { ExpandablePriceRow } from '@/src/widgets/molecules/ExpandablePriceRow';
import { WideColumns } from '@/src/widgets/molecules/WideColumns';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { TopTabs } from '@/src/widgets/molecules/TopTabs';
import { UnitSwitcher } from '@/src/widgets/molecules/UnitSwitcher';
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
  unit: ChartUnit;
  timeframe: Timeframe;
  timeframes: readonly Timeframe[];
  lockedTimeframes: readonly Timeframe[];
  onTimeframeChange: (tf: Timeframe) => void;
  onLockedTimeframe: () => void;
  currencySwitcher: ReturnType<typeof useChartCurrencySwitcher>;
};

/** Yalnızca kendi metalinin verisi değişince çizilir; diğer sayfanın yüklemesi ve kaydırma etkilemez. */
const ChartPage = memo(function ChartPage({
  symbol,
  width,
  points,
  loading,
  livePrice,
  currency,
  unit,
  timeframe,
  timeframes,
  lockedTimeframes,
  onTimeframeChange,
  onLockedTimeframe,
  currencySwitcher,
}: ChartPageProps) {
  const styles = useStyles();
  const isBrent = symbol === BRENT;
  // Brent'te alarm, ons ve metal detayı yoktur; fiyat son grafik noktasıdır.
  const alarmAssetId = isBrent ? undefined : (unit === 'ounce' ? OUNCE_ALARM_ASSET : METAL_ALARM_ASSET)[symbol];
  return (
    <View style={[styles.page, { width }]}>
      <PriceChart
        hideTimestamp
        // Grafik alanı sayfanın tam genişliğidir (`plotBare` kenar boşluğunu geri alır).
        plotWidth={width}
        points={points ?? EMPTY_POINTS}
        currency={currency}
        livePrice={livePrice}
        timeframe={timeframe}
        timeframes={timeframes}
        onTimeframeChange={onTimeframeChange}
        lockedTimeframes={lockedTimeframes}
        onLockedTimeframe={onLockedTimeframe}
        loading={loading}
        headerLeft={symbol === BRENT ? <OilIcon /> : <MetalIcon symbol={symbol} />}
        headerRight={
          <View style={styles.chartActions}>
            <CurrencySwitcher {...currencySwitcher} compact />
            {/* Gramda gram fiyatına, onsta ons (USD) fiyatına alarm kurulur. */}
            {alarmAssetId ? (
              <AlarmButton
                assetId={alarmAssetId}
                onPress={() => openAlarm(alarmAssetId)}
                accessibilityLabel={`${PAGE_NAMES[symbol]}${unit === 'ounce' ? ' onsu' : ''} için fiyat alarmı`}
              />
            ) : null}
            {isBrent ? null : (
              <FullscreenButton
                onPress={() => router.push({ pathname: '/metal/[symbol]', params: { symbol } })}
                accessibilityLabel={`${PAGE_NAMES[symbol]} detayı`}
              />
            )}
          </View>
        }
        flashOnLiveChange
        flashKey={`${currency}-${unit}`}
        bare
      />
    </View>
  );
});

const openAddHolding = (assetId: string) => router.push({ pathname: '/add-holding', params: { assetId } });
const openAlarm = (assetId: string) => router.push({ pathname: '/alarm', params: { assetId } });
const openDetail = (id: string) => router.push({ pathname: '/gold/[id]', params: { id } });

const PAGE_NAMES: Record<ChartSymbol, string> = {
  [BRENT]: 'Brent Petrol',
  [MetalSymbol.XAU]: 'Altın',
  [MetalSymbol.XAG]: 'Gümüş',
};

const CHART_TABS = CHART_SYMBOLS.map((symbol) => ({ id: symbol, label: PAGE_NAMES[symbol] }));

/** Metal grafikleri yan yana sayfalardır; hepsinin verisi hazır tutulur. */
function MarketChartSection() {
  const styles = useStyles();
  const { displayQuotes, displayOunceQuotes, timeframes, lockedTimeframes } = useMarketViewModel();
  const { timeframe, setTimeframe, unit, setUnit, chartCurrency, brentCurrency, charts, chartLoading } = useMarketChart();
  const currencySwitcher = useChartCurrencySwitcher();
  const brentSwitcher = useBrentCurrencySwitcher();
  const { openPaywall } = useSubscription();
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);

  const pagerRef = useRef<ComponentRef<typeof RNScrollView>>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  // Sayfa genişliği; web'de ayrıca doğrudan tarayıcıdan izlenir, çünkü react-native-web `onLayout`'u
  // pencere boyutu değişince birkaç saniye gecikebiliyor (o arada sayfalar yan yana taşıyordu).
  const pagerWrapRef = useRef<ComponentRef<typeof View>>(null);
  const onPageWidth = useCallback((width: number) => {
    setPageWidth((current) => (current === width ? current : width));
    pagerRef.current?.scrollTo({ x: pageRef.current * width, animated: false });
  }, []);
  useWebElementWidth(pagerWrapRef, onPageWidth);

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

      <TourTarget id="chart-tabs" style={styles.chartTabs}>
        <TopTabs
          tabs={CHART_TABS}
          value={CHART_SYMBOLS[page]}
          onChange={(symbol) => goTo(CHART_SYMBOLS.indexOf(symbol))}
        />
      </TourTarget>

      {/* Brent varil fiyatıdır; gram/ons ayrımı olmadığı için birim seçici gösterilmez. */}
      {CHART_SYMBOLS[page] === BRENT ? null : (
        <View style={styles.unitRow}>
          <TourTarget id="unit-switcher">
            <UnitSwitcher value={unit} onChange={setUnit} />
          </TourTarget>
        </View>
      )}

      <TourTarget id="chart" style={styles.pager}>
        {/* Genişlik sarmalayıcıdan ölçülür: web'de yatay ScrollView'un kendi onLayout'u pencere
            büyüyünce yeniden tetiklenmez, sayfalar eski genişlikte kalıp yan sayfa taşar. */}
        <View ref={pagerWrapRef} onLayout={(e) => onPageWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
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
              livePrice={(unit === 'ounce' ? displayOunceQuotes : displayQuotes).find((q) => q.symbol === symbol)?.bid}
              currency={symbol === BRENT ? brentCurrency : chartCurrency}
              unit={unit}
              timeframe={timeframe}
              timeframes={timeframes}
              lockedTimeframes={lockedTimeframes}
              onTimeframeChange={setTimeframe}
              onLockedTimeframe={onLockedTimeframe}
              currencySwitcher={symbol === BRENT ? brentSwitcher : currencySwitcher}
            />
          ))}
        </ScrollView>
        </View>
      </TourTarget>

    </View>
  );
}

export default function MarketScreen() {
  const styles = useStyles();
  const { state, error, displayGoldRates: goldRates, currency, refresh } = useMarketViewModel();
  const ticker = useMarketTicker();
  const [info, setInfo] = useState<MarketInfoId | null>(null);
  // Listede aynı anda tek satır açık: başka satıra dokununca önceki kapanır. İlk açılışta 24 ayar gram altın açıktır.
  const [openGoldId, setOpenGoldId] = useState<string | null>('gram-24');
  const toggleGold = useCallback((id: string) => setOpenGoldId((current) => (current === id ? null : id)), []);

  const goldProducts = GOLD_ASSETS.flatMap((asset) => {
    const rate = goldRates.find((r) => r.assetId === asset.id);
    return rate ? [{ asset, rate }] : [];
  });
  return (
    <View style={styles.root}>
      <TourTarget id="ticker">
        <MarketTicker items={ticker} />
      </TourTarget>
      <Screen scroll scrollId="market" onRefresh={() => void refresh()} refreshing={state === 'loading'}>
        {/* Masaüstünde grafik ve widget kartı solda, altın çeşitleri sağda; telefonda alt alta. */}
        <WideColumns
          main={
            <>
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
                accessibilityLabel="Ana ekran widget’ı, ücretsiz"
              >
                <View style={styles.widgetEntryText}>
                  <View style={styles.widgetEntryTitle}>
                    <AppText variant="bodyStrong">Ana ekran widget’ı</AppText>
                  </View>
                  <AppText variant="caption" tone="secondary">
                    Gram altın fiyatı telefonunun ana ekranında, ücretsiz
                  </AppText>
                </View>
                <AppText variant="bodyStrong" tone="gold">›</AppText>
              </Pressable>
            </>
          }
          aside={
            goldProducts.length ? (
              <TourTarget id="gold-list" style={styles.goldBlock}>
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
              </TourTarget>
            ) : null
          }
        />
      </Screen>
      {info ? <InfoSheet visible {...MARKET_INFO[info]} onClose={() => setInfo(null)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  chartSection: { gap: paddings.sm },
  goldBlock: { gap: 16 },
  flex: { flex: 1 },
  // Sayfalar ekran kenarına kadar kayar; her sayfa kendi kenar boşluğunu taşır.
  chartTabs: { marginHorizontal: -paddings.screen },
  unitRow: { alignItems: 'flex-end' },
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
