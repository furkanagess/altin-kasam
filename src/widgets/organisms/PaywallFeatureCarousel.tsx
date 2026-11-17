import { PREMIUM_FEATURE_ICONS, PREMIUM_FEATURES, type PremiumFeatureId } from '@/src/core/constants/premium';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useEffect, useRef } from 'react';
import { View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const GAP = 12;
const AUTO_MS = 4500;
/** Kullanıcı kaydırdıktan sonra otomatik geçiş bu kadar süre bekler. */
const RESUME_MS = 5000;

type Feature = (typeof PREMIUM_FEATURES)[number];

const PER_PAGE = 3;
/** Paywall'daki sıralama: en çok satın aldıran özellikler ilk sayfada. Listede olmayanlar sona eklenir. */
const ORDER: PremiumFeatureId[] = ['weekly', 'alarms', 'calendar', 'insight', 'widget', 'holdings'];
const ORDERED: Feature[] = [
  ...ORDER.map((id) => PREMIUM_FEATURES.find((f) => f.id === id)).filter((f): f is Feature => Boolean(f)),
  ...PREMIUM_FEATURES.filter((f) => !ORDER.includes(f.id)),
];
const PAGES: Feature[][] = Array.from({ length: Math.ceil(ORDERED.length / PER_PAGE) }, (_, i) =>
  ORDERED.slice(i * PER_PAGE, i * PER_PAGE + PER_PAGE),
);

/** Tek özellik kartı: ikon, başlık ve açıklama. */
function FeatureRow({ feature }: { feature: Feature }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.card} accessible accessibilityLabel={`${feature.title}. ${feature.detail}`}>
      <View style={styles.icon}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d={PREMIUM_FEATURE_ICONS[feature.id]}
            stroke={colors.brand.goldDeep}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {feature.title}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={2}>
          {feature.detail}
        </AppText>
      </View>
    </View>
  );
}

/** Bir sayfada alt alta 3 kart; ortadaki sayfa tam boy ve net, yandakiler hafif küçülüp soluklaşır. */
function FeaturePage({
  features,
  index,
  interval,
  width,
  offset,
}: {
  features: Feature[];
  index: number;
  interval: number;
  width: number;
  offset: SharedValue<number>;
}) {
  const styles = useStyles();
  const animated = useAnimatedStyle(() => {
    const range = [(index - 1) * interval, index * interval, (index + 1) * interval];
    return {
      opacity: interpolate(offset.get(), range, [0.5, 1, 0.5], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(offset.get(), range, [0.94, 1, 0.94], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[styles.page, { width }, animated]}>
      {features.map((f) => (
        <FeatureRow key={f.id} feature={f} />
      ))}
    </Animated.View>
  );
}

function Dot({ index, interval, offset }: { index: number; interval: number; offset: SharedValue<number> }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const animated = useAnimatedStyle(() => {
    const range = [(index - 1) * interval, index * interval, (index + 1) * interval];
    const t = interpolate(offset.get(), range, [0, 1, 0], Extrapolation.CLAMP);
    return { width: 6 + t * 14, opacity: 0.35 + t * 0.65 };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: colors.brand.gold }, animated]} />;
}

/**
 * Pro özellikleri: her sayfada 3 kart, yatay ve sayfa sayfa kayar. Kendiliğinden ilerler; kullanıcı kaydırınca bir süre
 * bekler. Hareket azaltma açıksa otomatik geçiş yapılmaz.
 */
export function PaywallFeatureCarousel({ width }: { width: number }) {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const ref = useAnimatedRef<Animated.ScrollView>();
  const offset = useSharedValue(0);
  const index = useRef(0);
  const pausedUntil = useRef(0);

  const cardWidth = Math.round(Math.min(width * 0.86, 420));
  const interval = cardWidth + GAP;
  const sideInset = (width - cardWidth) / 2;
  const count = PAGES.length;

  const onScroll = useAnimatedScrollHandler((e) => {
    offset.set(e.contentOffset.x);
  });

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      index.current = (index.current + 1) % count;
      ref.current?.scrollTo({ x: index.current * interval, animated: true });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reduce, count, interval, ref]);

  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    index.current = Math.max(0, Math.min(count - 1, Math.round(e.nativeEvent.contentOffset.x / interval)));
  };

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          pausedUntil.current = Date.now() + RESUME_MS;
        }}
        onMomentumScrollEnd={onSettled}
        style={{ width }}
        contentContainerStyle={[styles.track, { paddingHorizontal: sideInset }]}
        accessibilityLabel="Pro özellikleri"
      >
        {PAGES.map((features, i) => (
          <FeaturePage key={features[0].id} features={features} index={i} interval={interval} width={cardWidth} offset={offset} />
        ))}
      </Animated.ScrollView>
      <View style={styles.dots}>
        {PAGES.map((features, i) => (
          <Dot key={features[0].id} index={i} interval={interval} offset={offset} />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { gap: paddings.sm, alignItems: 'center' },
  track: { gap: GAP },
  page: { gap: paddings.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    minHeight: 72,
    paddingHorizontal: paddings.sm,
    paddingVertical: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldBadge,
  },
  copy: { flex: 1, gap: 2 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
}));
