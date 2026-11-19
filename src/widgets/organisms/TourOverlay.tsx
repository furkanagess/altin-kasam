import { useWindowSize } from '@/src/core/hooks/useWindowSize';
import { TOUR_STEPS } from '@/src/core/constants/tour';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { BRENT, MetalSymbol } from '@/src/domain/enums';
import { useTour } from '@/src/viewmodels/tour/TourProvider';
import { measureTourTarget, scrollTourTo, type TourRect } from '@/src/viewmodels/tour/tourTargets';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

const HOLE_PADDING = 6;
const HOLE_RADIUS = 14;
const CARD_GAP = 14;
const CARD_MAX_WIDTH = 420;
/** Sekme değişiminden sonra ekranın oturması için beklenir; sonra öğe ölçülür. */
const ROUTE_SETTLE_MS = 330;
const SCROLL_SETTLE_MS = 330;
const MEASURE_RETRIES = 6;
const MEASURE_RETRY_MS = 150;
/** Kaydırınca hedefin yerleşeceği hizanın üst güvenli alandan uzaklığı (başlık + fiyat şeridi altı). */
const SCROLL_TOP_OFFSET = 110;
const SWIPE_DISTANCE = 60;
const MOVE = { duration: 380, easing: Easing.bezier(0.22, 1, 0.36, 1) };

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const wait = (ms: number, timers: ReturnType<typeof setTimeout>[]) =>
  new Promise<void>((resolve) => {
    timers.push(setTimeout(resolve, ms));
  });

function roundedRect(x: number, y: number, w: number, h: number, radius: number) {
  'worklet';
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  return (
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/**
 * Uygulama turu: ekranı karartıp anlatılan öğeyi aydınlatır. Aydınlatma bir öğeden diğerine kayarak
 * geçer, gerekirse ekran kendiliğinden kaydırılır ya da sekme değişir. Aydınlatılan alana dokunmak
 * ya da yana kaydırmak sonraki adıma geçirir.
 */
export function TourOverlay() {
  const { active, stepIndex, stepCount, next, back, skip } = useTour();
  const styles = useStyles();
  const { colors } = useTheme();
  const { width, height } = useWindowSize();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Son ölçülen konum; yeni adım ölçülene kadar eskisi görünür, aydınlatma sonra oraya kayar.
  const [rect, setRect] = useState<TourRect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const swipeStart = useRef(0);

  const step = TOUR_STEPS[stepIndex];

  // Aydınlatma deliği: ekran ortasında sıfır boyuttan açılır, sonra hedeflere kayar.
  const hx = useSharedValue(width / 2);
  const hy = useSharedValue(height / 2);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);
  const pulse = useSharedValue(0);
  const cardY = useSharedValue(height / 2);

  const hole = rect
    ? {
        x: Math.max(rect.x - HOLE_PADDING, 4),
        y: Math.max(rect.y - HOLE_PADDING, 4),
        w: Math.min(rect.width + HOLE_PADDING * 2, width - 8),
        h: Math.min(rect.height + HOLE_PADDING * 2, step.maxHeight ?? Infinity),
      }
    : null;

  useEffect(() => {
    if (!active) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false));
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  // Delik ve kart hedefe yumuşakça kayar.
  const holeX = hole?.x;
  const holeY = hole?.y;
  const holeW = hole?.w;
  const holeH = hole?.h;
  useEffect(() => {
    if (!active) return;
    if (holeX === undefined || holeY === undefined || holeW === undefined || holeH === undefined) {
      hx.set(withTiming(width / 2, MOVE));
      hy.set(withTiming(height / 2, MOVE));
      hw.set(withTiming(0, MOVE));
      hh.set(withTiming(0, MOVE));
    } else {
      hx.set(withTiming(holeX, MOVE));
      hy.set(withTiming(holeY, MOVE));
      hw.set(withTiming(holeW, MOVE));
      hh.set(withTiming(holeH, MOVE));
    }
    // Kart, öğenin yanında daha çok yer olan tarafa konur; öğe yoksa ortalanır.
    const minY = insets.top + 8;
    const maxY = height - cardHeight - insets.bottom - 8;
    let top = (height - cardHeight) / 2;
    if (holeY !== undefined && holeH !== undefined) {
      const below = height - (holeY + holeH);
      top = below >= holeY ? holeY + holeH + CARD_GAP : holeY - CARD_GAP - cardHeight;
    }
    cardY.set(withSpring(Math.min(Math.max(top, minY), Math.max(maxY, minY)), { damping: 18, stiffness: 140 }));
  }, [active, holeX, holeY, holeW, holeH, cardHeight, width, height, insets.top, insets.bottom, hx, hy, hw, hh, cardY]);

  // Adım değişince: sekmeyi aç, gerekirse kaydır, öğeyi ölç; adıma özel gösteriyi oynat.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let demoStarted = false;

    const run = async () => {
      const route = step.route as string;
      const needsNavigation = pathnameRef.current !== route;
      if (needsNavigation) {
        router.navigate(step.route);
        await wait(ROUTE_SETTLE_MS, timers);
      }
      if (!alive) return;
      if (step.scroll) {
        const scrolled = await scrollTourTo(
          step.scroll.id,
          step.scroll.to === 'target' ? step.target : undefined,
          insets.top + SCROLL_TOP_OFFSET,
        );
        if (scrolled) await wait(SCROLL_SETTLE_MS, timers);
      } else if (!needsNavigation) {
        await wait(100, timers);
      }
      for (let attempt = 0; alive; attempt += 1) {
        const found = step.target ? await measureTourTarget(step.target) : null;
        if (!alive) return;
        if (found || !step.target || attempt >= MEASURE_RETRIES) {
          setRect(found);
          break;
        }
        await wait(MEASURE_RETRY_MS, timers);
      }
      if (!alive || step.demo !== 'charts') return;
      // Grafikleri sırayla gezdirip kullanıcıya sekmelerin ne yaptığını gösterir.
      demoStarted = true;
      const show = (metal: string) => router.setParams({ metal, at: String(Date.now()) });
      await wait(500, timers);
      if (!alive) return;
      show(MetalSymbol.XAG);
      await wait(850, timers);
      if (!alive) return;
      show(BRENT);
      await wait(850, timers);
      if (!alive) return;
      show(MetalSymbol.XAU);
    };
    void run();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      // Gösteri yarıda kesilirse grafik altına dönsün; sonraki adımlar altın sayfasını bekler.
      if (demoStarted && pathnameRef.current === '/') {
        router.setParams({ metal: MetalSymbol.XAU, at: String(Date.now()) });
      }
    };
  }, [active, step, insets.top]);

  const dimProps = useAnimatedProps(() => ({
    d: `M0 0H${width}V${height}H0Z${roundedRect(hx.value, hy.value, hw.value, hh.value, HOLE_RADIUS)}`,
  }));
  const ringProps = useAnimatedProps(() => ({
    x: hx.value,
    y: hy.value,
    width: hw.value,
    height: hh.value,
    strokeOpacity: hw.value > 1 ? 1 : 0,
  }));
  // Dışa doğru büyüyüp sönen halka: "buraya bak" vurgusu.
  const pulseProps = useAnimatedProps(() => {
    const grow = pulse.value * 12;
    return {
      x: hx.value - grow,
      y: hy.value - grow,
      width: hw.value + grow * 2,
      height: hh.value + grow * 2,
      strokeOpacity: hw.value > 1 ? 0.7 * (1 - pulse.value) : 0,
    };
  });
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateY: cardY.value }] }));

  if (!active) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;
  const nextLabel = isFirst ? 'Turu başlat' : isLast ? 'Bitir' : 'İleri';

  const onTouchStart = (e: GestureResponderEvent) => {
    swipeStart.current = e.nativeEvent.pageX;
  };
  // Yana kaydırma adım değiştirir: sola ileri, sağa geri.
  const onTouchEnd = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - swipeStart.current;
    if (dx <= -SWIPE_DISTANCE) next();
    else if (dx >= SWIPE_DISTANCE && !isFirst) back();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(180)}
      style={[StyleSheet.absoluteFill, styles.root]}
      accessibilityViewIsModal
      // Karartma dokunuşları yutar: tur sürerken alttaki ekran kullanılamaz.
      onStartShouldSetResponder={() => true}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <AnimatedPath animatedProps={dimProps} fill="rgba(8, 10, 14, 0.8)" fillRule="evenodd" />
        <AnimatedRect
          animatedProps={pulseProps}
          rx={HOLE_RADIUS + 6}
          fill="none"
          stroke={colors.brand.gold}
          strokeWidth={2}
        />
        <AnimatedRect animatedProps={ringProps} rx={HOLE_RADIUS} fill="none" stroke={colors.brand.gold} strokeWidth={2.5} />
      </Svg>

      {/* Aydınlatılan alana dokunmak sonraki adıma geçirir. */}
      {hole && !isLast ? (
        <Pressable
          onPress={next}
          style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
          accessibilityRole="button"
          accessibilityLabel="Sonraki adım"
        />
      ) : null}

      <Animated.View
        pointerEvents="box-none"
        style={[styles.cardWrap, cardStyle, { opacity: cardHeight ? 1 : 0 }]}
      >
        <View style={styles.card} onLayout={(e) => setCardHeight(Math.round(e.nativeEvent.layout.height))}>
          <View style={styles.cardTop}>
            <AppText variant="caption" tone="gold" style={styles.counter}>
              {isFirst || isLast ? 'ALTIN KASA TURU' : `ADIM ${stepIndex} / ${stepCount - 2}`}
            </AppText>
            {isLast ? null : (
              <Pressable onPress={skip} hitSlop={10} accessibilityRole="button" accessibilityLabel="Turu atla">
                <AppText variant="caption" tone="secondary">
                  Atla
                </AppText>
              </Pressable>
            )}
          </View>
          {/* Metin her adımda aşağıdan süzülerek gelir; kart ise yeni konumuna kayar. */}
          <Animated.View key={step.id} entering={FadeInDown.duration(300)} style={styles.copy}>
            <AppText variant="h3">{step.title}</AppText>
            <AppText tone="secondary">{step.body}</AppText>
          </Animated.View>
          <View style={styles.dots} accessibilityLabel={`Adım ${stepIndex + 1} / ${stepCount}`}>
            {TOUR_STEPS.map((s, i) => (
              <View
                key={s.id}
                style={[styles.dot, { backgroundColor: i === stepIndex ? colors.brand.gold : colors.border.strong }, i === stepIndex && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.buttons}>
            {isFirst ? null : (
              <View style={styles.back}>
                <AppButton label="Geri" variant="secondary" onPress={back} />
              </View>
            )}
            <View style={styles.next}>
              <AppButton label={nextLabel} onPress={next} />
            </View>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { zIndex: 1000, elevation: 1000 },
  cardWrap: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: paddings.md, alignItems: 'center' },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    gap: paddings.sm,
    padding: paddings.card,
    borderRadius: radii.xl,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  counter: { fontWeight: '700', letterSpacing: 0.6 },
  copy: { gap: paddings.xs },
  dots: { flexDirection: 'row', alignSelf: 'center', gap: 5, paddingTop: paddings.xxs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 16 },
  buttons: { flexDirection: 'row', gap: paddings.sm, paddingTop: paddings.xxs },
  back: { flex: 1 },
  next: { flex: 2 },
}));
