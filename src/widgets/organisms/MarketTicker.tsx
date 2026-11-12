import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import type { TickerItem } from '@/src/domain/models';
import { formatNumber } from '@/src/utils/format';
import { router, useFocusEffect } from 'expo-router';
import React, { memo, useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Kayma hızı (px/sn); bir tur süresi içerik genişliğine göre hesaplanır. */
const SPEED = 36;
/** Şerit sayfa zemininin tersi: açık temada koyu (kuyumcu panosu gibi), koyu temada açık. */
const STRIPS = {
  light: { background: '#16181D', label: '#D9A93F', value: '#F4F1EA', up: '#3CCB7F', down: '#FF6B5E' },
  dark: { background: '#F4F1EA', label: '#8A6416', value: '#16181D', up: '#1F7A4C', down: '#B42318' },
} as const;

type Strip = (typeof STRIPS)[keyof typeof STRIPS];

/** Kalemin detayı: altın çeşidi ekranı ya da Piyasa'daki metal grafiği. Kurlarda detay yok. */
const TICKER_TARGETS: Record<string, { gold: string } | { metal: MetalSymbol }> = {
  gram: { gold: 'gram-24' },
  '22ayar': { gold: 'gram-22' },
  '14ayar': { gold: 'gram-14' },
  ceyrek: { gold: 'ceyrek-22' },
  ons: { metal: MetalSymbol.XAU },
  gumus: { metal: MetalSymbol.XAG },
};

function openTarget(id: string) {
  const target = TICKER_TARGETS[id];
  if (!target) return;
  if ('gold' in target) router.push({ pathname: '/gold/[id]', params: { id: target.gold } });
  // `at`: aynı metale yeniden dokunulduğunda da Piyasa ekranı o sayfaya döner.
  else router.navigate({ pathname: '/', params: { metal: target.metal, at: String(Date.now()) } });
}

/** Yalnızca değeri değişen kalem yeniden çizilir. */
const TickerEntry = memo(function TickerEntry({ item, strip }: { item: TickerItem; strip: Strip }) {
  const styles = useStyles();
  const change = item.changePercent;
  const pressable = item.id in TICKER_TARGETS;
  return (
    <Pressable
      disabled={!pressable}
      onPress={() => openTarget(item.id)}
      style={({ pressed }) => [styles.entry, pressed && styles.pressed]}
      hitSlop={{ top: 8, bottom: 8 }}
      accessibilityRole={pressable ? 'link' : undefined}
      accessibilityLabel={pressable ? `${item.label} detayı` : undefined}
    >
      <Text style={[styles.label, { color: strip.label }]}>{item.label}</Text>
      <Text style={[styles.value, { color: strip.value }]}>
        {item.currency === 'USD' ? `$${formatNumber(item.value)}` : formatNumber(item.value)}
      </Text>
      {change != null && change !== 0 ? (
        <Text style={[styles.arrow, { color: change > 0 ? strip.up : strip.down }]}>{change > 0 ? '▲' : '▼'}</Text>
      ) : null}
    </Pressable>
  );
});

function Entries({
  items,
  strip,
  onLayout,
}: {
  items: TickerItem[];
  strip: Strip;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row} onLayout={onLayout}>
      {items.map((item) => (
        <TickerEntry key={item.id} item={item} strip={strip} />
      ))}
    </View>
  );
}

const IS_WEB = Platform.OS === 'web';

/**
 * Web'de kayma CSS animasyonudur: tarayıcının compositor katmanında çalışır, JS thread'deki
 * fiyat güncellemeleri ve yeniden çizimler kaymayı etkilemez. İz iki kopyadan oluştuğu için
 * %50 kaydırma tam bir kopya genişliğidir; genişlik değişse de animasyon yeniden başlamaz.
 */
// react-native-web `animationKeyframes`'i yalnızca StyleSheet.create ile derlenen stilde destekler.
const webStyles = StyleSheet.create({
  marquee: {
    animationKeyframes: [{ '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } }],
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    willChange: 'transform',
  } as unknown as ViewStyle,
});

/**
 * Sürekli kayan piyasa özeti. İçerik iki kez yan yana çizilir ve bir kopya genişliği kadar
 * kaydırılıp başa sarılır. Native'de kayma UI thread'de çalışır: ilerleme (0→1) ve kopya
 * genişliği ayrı paylaşılan değerlerdir, fiyat güncellemesi genişliği değiştirse de tur baştan
 * başlamaz. Sekme görünmezken durur; hareket azaltma açıksa kaymaz, elle kaydırılır.
 */
export const MarketTicker = memo(function MarketTicker({ items }: { items: TickerItem[] }) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const strip = STRIPS[scheme];
  const reduceMotion = useReducedMotion();
  // Tur süresi ilk ölçümle bir kez belirlenir; sonraki genişlik değişimleri hızı çok az etkiler.
  const [loopMs, setLoopMs] = useState(0);
  const progress = useSharedValue(0);
  const copyWidth = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const width = e.nativeEvent.layout.width;
      if (!width) return;
      copyWidth.set(width);
      setLoopMs((prev) => prev || Math.round((width / SPEED) * 1000));
    },
    [copyWidth],
  );

  useFocusEffect(
    useCallback(() => {
      if (!loopMs || reduceMotion || IS_WEB) return;
      progress.set(0);
      progress.set(withRepeat(withTiming(1, { duration: loopMs, easing: Easing.linear }), -1, false));
      return () => cancelAnimation(progress);
    }, [loopMs, reduceMotion, progress]),
  );

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -progress.get() * copyWidth.get() }] }));

  if (!items.length) return null;

  const summary = items
    .map((i) => `${i.label} ${i.currency === 'USD' ? `${formatNumber(i.value)} dolar` : formatNumber(i.value)}`)
    .join(', ');

  return (
    <View
      style={[styles.strip, { backgroundColor: strip.background, borderBottomColor: colors.brand.goldSoft }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Piyasa özeti: ${summary}`}
    >
      {reduceMotion ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Entries items={items} strip={strip} />
        </ScrollView>
      ) : (
        IS_WEB ? (
          <View
            style={[
              styles.track,
              loopMs ? webStyles.marquee : null,
              loopMs ? ({ animationDuration: `${loopMs}ms` } as unknown as ViewStyle) : null,
            ]}
            importantForAccessibility="no-hide-descendants"
          >
            <Entries items={items} strip={strip} onLayout={onLayout} />
            <Entries items={items} strip={strip} />
          </View>
        ) : (
          <Animated.View
            style={[styles.track, trackStyle]}
            importantForAccessibility="no-hide-descendants"
            // Kayan şerit bir katman olarak önbelleğe alınır; her karede metin yeniden çizilmez.
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            <Entries items={items} strip={strip} onLayout={onLayout} />
            <Entries items={items} strip={strip} />
          </Animated.View>
        )
      )}
    </View>
  );
});

const useStyles = makeStyles((colors) => ({
  strip: {
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
    borderBottomWidth: 1,
  },
  track: { flexDirection: 'row', alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: paddings.md,
  },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  value: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  arrow: { fontSize: 10 },
  pressed: { opacity: 0.6 },
}));
