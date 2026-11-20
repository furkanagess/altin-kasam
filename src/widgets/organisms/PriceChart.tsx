import { PriceTimestamp } from '@/src/widgets/molecules/PriceTimestamp';
import {
  TIMEFRAME_DESCRIPTIONS,
  TIMEFRAME_LABELS,
  TIMEFRAME_SHOWS_TIME,
  TIMEFRAME_SPAN_MS,
  type Currency,
  type Timeframe,
} from '@/src/core/constants/app';
import { makeStyles, paddings, radii, typography, useTheme } from '@/src/core/theme';
import type { CandlePoint } from '@/src/domain/models';
import {
  formatAxisTick,
  formatChartDate,
  formatMoney,
  formatPercent,
  formatSignedMoney,
} from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { FlashingText } from '@/src/widgets/atoms/FlashingText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { useWebElementWidth } from '@/src/core/hooks/useWebElementWidth';
import React, { memo, useCallback, useId, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

const PADDING_Y = 18;
const EXTREME_LABEL_WIDTH = 96;
/** Kasaya ekleme rozetinin yarıçapı. */
const MARKER_R = 6;
/** Eksen etiketlerinin ve dikey kılavuz çizgilerinin konumu (0 = sol, 1 = sağ). */
const TICKS = [0, 1 / 3, 2 / 3, 1];
const TICK_GRANULARITY: Record<Timeframe, 'time' | 'day' | 'month'> = {
  '1D': 'time',
  '1W': 'day',
  '1M': 'day',
  '3M': 'day',
  '1Y': 'month',
};

/** Değişim etiketleri ("Toplam", "Bugün") alt alta gelince değerler aynı hizada başlar. */
export const CHANGE_LABEL_WIDTH = 44;

type Props = {
  points: CandlePoint[];
  /** `points` ve `livePrice`'ın para birimi. */
  currency: Currency;
  /** Verilirse serinin son noktası bu fiyatla canlı güncellenir. */
  livePrice?: number;
  timeframe: Timeframe;
  timeframes: readonly Timeframe[];
  onTimeframeChange: (timeframe: Timeframe) => void;
  /** Görünür ama seçilemez periyotlar (Pro); dokununca `onLockedTimeframe` çağrılır. */
  lockedTimeframes?: readonly Timeframe[];
  onLockedTimeframe?: (timeframe: Timeframe) => void;
  loading?: boolean;
  height?: number;
  /** Fiyat bilgisinin solunda gösterilir (örn. metal ikonu). */
  headerLeft?: ReactNode;
  /** Fiyat bilgisinin sağında gösterilir (örn. para birimi seçici). */
  headerRight?: ReactNode;
  /** Canlı fiyat değişince üstteki fiyat yükselişte yeşil, düşüşte kırmızı yanar. */
  flashOnLiveChange?: boolean;
  /** Bu anahtar değişince (ör. gram → ons) fiyat değişimi yanma sayılmaz; verilmezse para birimi. */
  flashKey?: string;
  /** Kartın en üstünde, fiyatın üstünde gösterilir (ör. "Gram Altın (24)"). */
  title?: string;
  /** Başlık satırının sağında (ör. tam ekran düğmesi). */
  titleRight?: ReactNode;
  /**
   * `points` ile aynı uzunlukta karşılaştırma serisi (ör. o ana kadarki toplam maliyet).
   * Verilirse değişim dönem başına değil bu seriye göre hesaplanır, kesikli çizgi son değerine
   * çizilir.
   */
  baseline?: number[];
  /**
   * Yatay eksen seçili periyodun tamamını kapsar (ör. 1G: son 24 saat); seri daha geç başlıyorsa
   * çizgi başladığı yerden çizilir. Verilmezse eksen serinin ilk–son noktasıdır.
   */
  fullPeriod?: boolean;
  /** `points` içindeki sıralar; bu noktalar grafikte "+" rozetiyle işaretlenir (ör. kasaya ekleme). */
  markers?: readonly number[];
  /** Grafikte gezinirken işaretli noktaya gelince tarihin yanında gösterilir. */
  markerLabel?: string;
  /** Değişimin önünde küçük etiket (ör. "Toplam"). */
  changeLabel?: string;
  /** Değişimin yanında; grafikte gezinirken gizlenir (ör. günlük kâr/zarar). */
  changeExtra?: ReactNode;
  /** Para birimi olmayan seriler için (ör. rasyo); verilmezse değerler `currency` ile yazılır. */
  formatValue?: (value: number) => string;
  /** Kart çerçevesi olmadan, doğrudan ekran zemininde; çizim alanı ekran kenarına kadar uzanır. */
  bare?: boolean;
  /** Saat başka yerde (ör. ekran başlığında) gösteriliyorsa grafikte gizlenir. */
  hideTimestamp?: boolean;
  /**
   * Çizim alanının genişliği biliniyorsa (ör. sayfalayıcıda sayfa genişliği) doğrudan verilir;
   * grafik kendi alanını ayrıca ölçmez. Web'de iç içe ölçümler düzen değişirken ara bir değer
   * yakalayıp grafiği bir süre sıkışık çizebiliyordu.
   */
  plotWidth?: number;
};

type TimeframeTabsProps = {
  timeframes: readonly Timeframe[];
  timeframe: Timeframe;
  lockedTimeframes: readonly Timeframe[];
  onTimeframeChange: (timeframe: Timeframe) => void;
  onLockedTimeframe?: (timeframe: Timeframe) => void;
};

/** Saniyelik fiyat tiklerinde grafik yeniden çizilir; periyot düğmeleri yalnızca seçim değişince. */
const TimeframeTabs = memo(function TimeframeTabs({
  timeframes,
  timeframe,
  lockedTimeframes,
  onTimeframeChange,
  onLockedTimeframe,
}: TimeframeTabsProps) {
  const styles = useStyles();
  return (
    <View style={styles.tabs}>
      {timeframes.map((tf) => {
        const selected = tf === timeframe;
        const locked = lockedTimeframes.includes(tf);
        return (
          <Pressable
            key={tf}
            onPress={() => (locked ? onLockedTimeframe?.(tf) : onTimeframeChange(tf))}
            style={[styles.tab, selected && styles.tabActive]}
            accessibilityRole="button"
            // Ad görünen kısaltmayla başlar ("1G, Son 24 saat"); sesli komutla da seçilebilir.
            accessibilityLabel={`${TIMEFRAME_LABELS[tf]}, ${TIMEFRAME_DESCRIPTIONS[tf]}${locked ? ', Pro' : ''}`}
            accessibilityState={{ selected }}
            hitSlop={4}
          >
            <AppText
              variant="caption"
              tone={selected ? 'primary' : locked ? 'tertiary' : 'secondary'}
              style={selected && styles.tabTextActive}
            >
              {TIMEFRAME_LABELS[tf]}
            </AppText>
            {locked ? <ProMark /> : null}
          </Pressable>
        );
      })}
    </View>
  );
});

export function PriceChart({
  points,
  currency,
  livePrice,
  timeframe,
  timeframes,
  onTimeframeChange,
  lockedTimeframes = [],
  onLockedTimeframe,
  loading,
  height = 200,
  headerLeft,
  headerRight,
  flashOnLiveChange,
  flashKey,
  title,
  titleRight,
  baseline,
  fullPeriod,
  markers,
  markerLabel,
  formatValue,
  changeLabel,
  changeExtra,
  bare,
  hideTimestamp,
  plotWidth,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const gradientId = `chartFill${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [measuredWidth, setWidth] = useState(0);
  const width = plotWidth && plotWidth > 0 ? plotWidth : measuredWidth;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const series = useMemo(() => {
    const last = points[points.length - 1];
    if (!livePrice || points.length < 2 || !last) return points;
    return [...points.slice(0, -1), { t: last.t, v: livePrice }];
  }, [points, livePrice]);

  const format = formatValue ?? ((value: number) => formatMoney(value, currency));
  const formatSigned = formatValue
    ? (value: number) => `${value > 0 ? '+' : ''}${formatValue(value)}`
    : (value: number) => formatSignedMoney(value, currency);
  const baselineNow = baseline?.length === series.length ? baseline[baseline.length - 1] : undefined;

  // Zaman ekseni: tam periyotta x zamana göre, değilse nokta sırasına göre yerleşir.
  const domain = useMemo(() => {
    if (!fullPeriod || series.length < 2) return null;
    const end = series[series.length - 1].t;
    const start = Math.min(series[0].t, end - TIMEFRAME_SPAN_MS[timeframe]);
    return end > start ? { start, end } : null;
  }, [fullPeriod, series, timeframe]);

  const geometry = useMemo(() => {
    if (series.length < 2 || width <= 0) return null;
    const values = series.map((p) => p.v);
    // Maliyet çizgisi görünür kalsın diye ölçeğe dahil edilir.
    const scaleValues = baselineNow != null ? [...values, baselineNow] : values;
    const min = Math.min(...scaleValues);
    const max = Math.max(...scaleValues);
    const span = max - min || max * 0.01 || 1;
    const bottom = height - PADDING_Y;
    const toY = (v: number) => bottom - ((v - min) / span) * (bottom - PADDING_Y);
    const coords = series.map((p, i) => ({
      x: domain ? ((p.t - domain.start) / (domain.end - domain.start)) * width : (i / (series.length - 1)) * width,
      y: toY(p.v),
    }));
    const line = coords
      .map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join('');
    const firstX = coords[0].x;
    const lastX = coords[coords.length - 1].x;
    return {
      coords,
      line,
      area: `${line}L${lastX.toFixed(1)},${height}L${firstX.toFixed(1)},${height}Z`,
      firstX,
      baselineY: toY(baselineNow ?? series[0].v),
      min: Math.min(...values),
      max: Math.max(...values),
      minIndex: values.indexOf(Math.min(...values)),
      maxIndex: values.indexOf(Math.max(...values)),
    };
  }, [series, width, height, baselineNow, domain]);

  const ticks = useMemo(
    () =>
      series.length < 2
        ? []
        : TICKS.map((f) =>
            domain
              ? domain.start + f * (domain.end - domain.start)
              : series[Math.round(f * (series.length - 1))].t,
          ),
    [series, domain],
  );

  const scrubTo = useCallback(
    (x: number) => {
      if (series.length < 2 || width <= 0) return;
      let index: number;
      if (domain) {
        // En yakın nokta zamana göre; seri başlamadan önceki boş alanda ilk nokta seçilir.
        const t = domain.start + (Math.min(Math.max(x, 0), width) / width) * (domain.end - domain.start);
        index = 0;
        for (let i = 1; i < series.length; i += 1) {
          if (Math.abs(series[i].t - t) < Math.abs(series[index].t - t)) index = i;
        }
      } else {
        index = Math.min(series.length - 1, Math.max(0, Math.round((x / width) * (series.length - 1))));
      }
      setActiveIndex((prev) => (prev === index ? prev : index));
    },
    [series, width, domain],
  );

  // Yatay sürükleme grafikte gezinir; dikey hareket sayfanın kaydırılmasına bırakılır.
  const pan = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-6, 6],
    failOffsetY: [-12, 12],
    onActivate: (e) => scrubTo(e.x),
    onUpdate: (e) => scrubTo(e.x),
    onFinalize: () => setActiveIndex(null),
  });

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  // Web'de genişlik ayrıca doğrudan tarayıcıdan izlenir (bkz. `useWebElementWidth`).
  const plotRef = useRef<ComponentRef<typeof View>>(null);
  useWebElementWidth(plotRef, setWidth);

  const first = series[0];
  const last = series[series.length - 1];
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const shown = active ?? last;
  // Maliyet serisi varsa kâr/zarar: gösterilen noktadaki değer − o ana kadarki maliyet.
  const shownIndex = activeIndex ?? series.length - 1;
  const reference = baselineNow != null ? baseline![shownIndex] : first?.v;
  const change = shown && reference != null ? shown.v - reference : 0;
  const changePercent = reference ? (change / reference) * 100 : 0;
  const periodUp = baselineNow != null ? !last || last.v >= baselineNow : !first || !last || last.v >= first.v;
  const lineColor = periodUp ? colors.semantic.up : colors.semantic.down;
  const showTime = TIMEFRAME_SHOWS_TIME[timeframe];
  const activeCoord = activeIndex != null ? geometry?.coords[activeIndex] : undefined;
  const markerCoords = useMemo(
    () => (geometry && markers?.length ? markers.flatMap((i) => (geometry.coords[i] ? [geometry.coords[i]] : [])) : []),
    [geometry, markers],
  );
  const activeIsMarker = activeIndex != null && !!markers?.includes(activeIndex);

  // Çizim alanı kart kenarına kadar uzanır; etiketler kartın iç boşluğunda kalır.
  const extremeLabelLeft = (index: number) =>
    Math.min(
      Math.max(paddings.md, (geometry?.coords[index]?.x ?? 0) - EXTREME_LABEL_WIDTH / 2),
      Math.max(paddings.md, width - EXTREME_LABEL_WIDTH - paddings.md),
    );

  return (
    <View style={[styles.wrap, bare && styles.wrapBare]}>
      <View style={styles.header}>
        {title || titleRight ? (
          <View style={styles.titleRow}>
            <AppText variant="h3" numberOfLines={1} style={styles.titleText}>
              {title}
            </AppText>
            {titleRight}
          </View>
        ) : null}
        <View style={styles.headerTop}>
          {headerLeft}
          {flashOnLiveChange ? (
            // Grafikte gezinirken seçili noktanın fiyatı gösterilir; o sırada yanma olmaz.
            <FlashingText
              variant="price"
              value={active ? undefined : livePrice}
              resetKey={flashKey ?? currency}
              style={styles.price}
              numberOfLines={1}
            >
              {shown ? format(shown.v) : '—'}
            </FlashingText>
          ) : (
            <AppText variant="price" style={styles.price} numberOfLines={1}>
              {shown ? format(shown.v) : '—'}
            </AppText>
          )}
          {headerRight}
        </View>
        <View style={styles.headerRow}>
          {shown && first ? (
            <View style={styles.change}>
              {changeLabel ? (
                <AppText variant="caption" tone="secondary" style={styles.changeLabel}>
                  {changeLabel}
                </AppText>
              ) : null}
              <AppText variant="bodyStrong" tone={change >= 0 ? 'up' : 'down'}>
                {formatSigned(change)} ({formatPercent(changePercent)})
              </AppText>
            </View>
          ) : null}
          {!active ? changeExtra : null}
          {!active && livePrice && !hideTimestamp ? <PriceTimestamp /> : null}
          {active ? (
            <AppText variant="caption" tone="secondary">
              {formatChartDate(active.t, showTime)}
              {activeIsMarker && markerLabel ? ` · ${markerLabel}` : ''}
            </AppText>
          ) : null}
        </View>
      </View>

      <GestureDetector gesture={pan}>
        <View
          ref={plotRef}
          style={[styles.plot, bare && styles.plotBare, { height }]}
          onLayout={onLayout}
          accessibilityRole="image"
          accessibilityLabel={
            first && last
              ? `${TIMEFRAME_DESCRIPTIONS[timeframe]} fiyat grafiği, ${format(first.v)} → ${format(last.v)}`
              : 'Fiyat grafiği'
          }
        >
          {geometry ? (
            <>
              <Svg width={width} height={height}>
                <Defs>
                  <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={lineColor} stopOpacity={0.22} />
                    <Stop offset="1" stopColor={lineColor} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {TICKS.slice(1, -1).map((f) => (
                  <Line
                    key={f}
                    x1={f * width}
                    x2={f * width}
                    y1={0}
                    y2={height}
                    stroke={colors.border.subtle}
                    strokeWidth={1}
                    strokeDasharray="2 5"
                    strokeOpacity={0.7}
                  />
                ))}
                <Line
                  x1={geometry.firstX}
                  x2={width}
                  y1={geometry.baselineY}
                  y2={geometry.baselineY}
                  stroke={colors.border.strong}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <Path d={geometry.area} fill={`url(#${gradientId})`} />
                <Path
                  d={geometry.line}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* Tam periyotta seri geç başlıyorsa başlangıç (ilk alım) noktası işaretlenir. */}
                {domain && geometry.firstX > 4 && !markers?.includes(0) ? (
                  <Circle cx={geometry.firstX} cy={geometry.coords[0].y} r={3.5} fill={lineColor} />
                ) : null}
                {markerCoords.map((c, i) => (
                  <G key={i}>
                    <Circle
                      cx={c.x}
                      cy={c.y}
                      r={MARKER_R}
                      fill={colors.brand.gold}
                      stroke={colors.surface.elevated}
                      strokeWidth={1.5}
                    />
                    <Line
                      x1={c.x - MARKER_R / 2}
                      x2={c.x + MARKER_R / 2}
                      y1={c.y}
                      y2={c.y}
                      stroke={colors.text.onGold}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                    />
                    <Line
                      x1={c.x}
                      x2={c.x}
                      y1={c.y - MARKER_R / 2}
                      y2={c.y + MARKER_R / 2}
                      stroke={colors.text.onGold}
                      strokeWidth={1.6}
                      strokeLinecap="round"
                    />
                  </G>
                ))}
                {activeCoord ? (
                  <>
                    <Line
                      x1={activeCoord.x}
                      x2={activeCoord.x}
                      y1={0}
                      y2={height}
                      stroke={colors.brand.inkMuted}
                      strokeWidth={1}
                    />
                    <Circle
                      cx={activeCoord.x}
                      cy={activeCoord.y}
                      r={5}
                      fill={lineColor}
                      stroke={colors.surface.elevated}
                      strokeWidth={2}
                    />
                  </>
                ) : null}
              </Svg>
              {!active ? (
                <>
                  <AppText
                    variant="caption"
                    tone="tertiary"
                    pointerEvents="none"
                    style={[styles.extreme, styles.extremeTop, { left: extremeLabelLeft(geometry.maxIndex) }]}
                  >
                    {format(geometry.max)}
                  </AppText>
                  <AppText
                    variant="caption"
                    tone="tertiary"
                    pointerEvents="none"
                    style={[styles.extreme, styles.extremeBottom, { left: extremeLabelLeft(geometry.minIndex) }]}
                  >
                    {format(geometry.min)}
                  </AppText>
                </>
              ) : null}
              {/* Mevcut grafik görünür kalır; yeni seri gelince yerinde değişir. */}
              {loading ? (
                <View style={styles.updating} pointerEvents="none">
                  <ActivityIndicator size="small" color={colors.brand.gold} />
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.empty}>
              {loading || width <= 0 ? (
                <ActivityIndicator color={colors.brand.gold} />
              ) : (
                <AppText tone="tertiary">Grafik verisi yok</AppText>
              )}
            </View>
          )}
        </View>
      </GestureDetector>

      {/* Eksen veri gelmeden de yerini tutar; veri gelince altındakiler aşağı kaymaz. */}
      <View style={styles.axis}>
        {ticks.map((t, i) => (
          <AppText key={i} variant="caption" tone="tertiary" style={styles.axisLabel}>
            {formatAxisTick(t, TICK_GRANULARITY[timeframe])}
          </AppText>
        ))}
      </View>

      <TimeframeTabs
        timeframes={timeframes}
        timeframe={timeframe}
        lockedTimeframes={lockedTimeframes}
        onTimeframeChange={onTimeframeChange}
        onLockedTimeframe={onLockedTimeframe}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: paddings.md,
    gap: 10,
  },
  header: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  titleText: { flex: 1 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  price: { flex: 1 },
  plot: { marginHorizontal: -paddings.md },
  wrapBare: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, padding: 0 },
  plotBare: { marginHorizontal: -paddings.screen },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 8,
    // Değişim satırı veri gelmeden de yerini tutar (düzen kayması olmasın).
    minHeight: typography.bodyStrong.lineHeight,
  },
  change: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  changeLabel: { minWidth: CHANGE_LABEL_WIDTH },
  extreme: {
    position: 'absolute',
    width: EXTREME_LABEL_WIDTH,
    textAlign: 'center',
  },
  extremeTop: { top: 0 },
  extremeBottom: { bottom: 0 },
  updating: {
    position: 'absolute',
    top: 0,
    left: paddings.md,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: typography.caption.lineHeight,
  },
  axisLabel: { fontVariant: ['tabular-nums'] },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: paddings.xs,
    borderRadius: radii.pill,
  },
  tabActive: {
    backgroundColor: colors.brand.goldSoft,
  },
  tabTextActive: {
    fontWeight: '700',
  },
}));
