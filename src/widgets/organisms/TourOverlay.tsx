import { TOUR_STEPS } from '@/src/core/constants/tour';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { useTour } from '@/src/viewmodels/tour/TourProvider';
import { measureTourTarget, type TourRect } from '@/src/viewmodels/tour/tourTargets';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

const HOLE_PADDING = 6;
const HOLE_RADIUS = 14;
const CARD_GAP = 14;
const CARD_MAX_WIDTH = 420;
/** Sekme değişiminden sonra ekranın oturması için beklenir; sonra öğe ölçülür. */
const ROUTE_SETTLE_MS = 450;
const MEASURE_RETRIES = 6;
const MEASURE_RETRY_MS = 150;

const roundedRect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
  `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;

/**
 * Uygulama turu: ekranı karartıp anlatılan öğeyi aydınlatır, yanında açıklama kartı gösterir.
 * Adım başka sekme istiyorsa sekmeyi kendisi açar.
 */
export function TourOverlay() {
  const { active, stepIndex, stepCount, next, back, skip } = useTour();
  const styles = useStyles();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);
  const [fade] = useState(() => new Animated.Value(0));
  // Ölçüm hangi adım için yapıldıysa onunla birlikte tutulur; adım değişince eski ölçüm kendiliğinden geçersiz olur.
  const [result, setResult] = useState<{ stepId: string; rect: TourRect | null } | null>(null);

  const step = TOUR_STEPS[stepIndex];

  useEffect(() => {
    Animated.timing(fade, { toValue: active ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [active, fade]);

  // Adım değişince: gerekirse sekmeyi aç, sonra öğeyi ölç.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    const route = step.route as string;
    const needsNavigation = pathnameRef.current !== route;
    if (needsNavigation) router.navigate(step.route);
    const timers: ReturnType<typeof setTimeout>[] = [];

    const measure = async (attempt: number) => {
      if (!alive) return;
      const found = step.target ? await measureTourTarget(step.target) : null;
      if (!alive) return;
      if (found || !step.target || attempt >= MEASURE_RETRIES) {
        setResult({ stepId: step.id, rect: found });
        return;
      }
      timers.push(setTimeout(() => void measure(attempt + 1), MEASURE_RETRY_MS));
    };
    timers.push(setTimeout(() => void measure(0), needsNavigation ? ROUTE_SETTLE_MS : 120));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [active, step]);

  if (!active) return null;

  const measured = result?.stepId === step.id;
  const rect = measured ? result.rect : null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;
  const hole = rect
    ? {
        x: Math.max(rect.x - HOLE_PADDING, 4),
        y: Math.max(rect.y - HOLE_PADDING, 4),
        w: Math.min(rect.width + HOLE_PADDING * 2, width - 8),
        h: rect.height + HOLE_PADDING * 2,
      }
    : null;

  // Kart, öğenin yanında daha çok yer olan tarafa konur; öğe yoksa ortalanır.
  let cardPosition: { top?: number; bottom?: number } = {};
  if (hole) {
    const below = height - (hole.y + hole.h);
    cardPosition = below >= hole.y ? { top: hole.y + hole.h + CARD_GAP } : { bottom: height - hole.y + CARD_GAP };
  }

  const nextLabel = isFirst ? 'Turu başlat' : isLast ? 'Bitir' : 'İleri';

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
      accessibilityViewIsModal
      // Karartma dokunuşları yutar: tur sürerken alttaki ekran kullanılamaz.
      onStartShouldSetResponder={() => true}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path
          d={`M0 0H${width}V${height}H0Z${hole ? roundedRect(hole.x, hole.y, hole.w, hole.h, HOLE_RADIUS) : ''}`}
          fill="rgba(8, 10, 14, 0.8)"
          fillRule="evenodd"
        />
        {hole ? (
          <Rect
            x={hole.x}
            y={hole.y}
            width={hole.w}
            height={hole.h}
            rx={HOLE_RADIUS}
            fill="none"
            stroke={colors.brand.gold}
            strokeWidth={2.5}
          />
        ) : null}
      </Svg>

      {measured ? (
        <View
          pointerEvents="box-none"
          style={[styles.cardWrap, hole ? { position: 'absolute', left: 0, right: 0, ...cardPosition } : styles.cardCenter]}
        >
          <View style={styles.card}>
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
            <AppText variant="h3">{step.title}</AppText>
            <AppText tone="secondary">{step.body}</AppText>
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
        </View>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { zIndex: 1000, elevation: 1000 },
  cardWrap: { paddingHorizontal: paddings.md, alignItems: 'center' },
  cardCenter: { flex: 1, justifyContent: 'center' },
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
  dots: { flexDirection: 'row', alignSelf: 'center', gap: 5, paddingTop: paddings.xxs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActive: { width: 16 },
  buttons: { flexDirection: 'row', gap: paddings.sm, paddingTop: paddings.xxs },
  back: { flex: 1 },
  next: { flex: 2 },
}));
