import { makeStyles, paddings } from '@/src/core/theme';
import { formatClockTime, formatNumber, formatTRY } from '@/src/utils/format';
import { useEconomicCalendar } from '@/src/viewmodels/analysis/EconomicCalendarProvider';
import { useGramAskPrice } from '@/src/viewmodels/goal/useGoalProgress';
import { ClockIcon } from '@/src/widgets/atoms/ClockIcon';
import { getGoldAsset } from '@/src/core/constants/goldAssets';
import { BellIcon } from '@/src/widgets/atoms/BellIcon';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { Badge } from '@/src/widgets/atoms/Badge';
import { FlagIcon } from '@/src/widgets/atoms/FlagIcon';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { Bar, Coin, DOOR, Vault, VAULT, VaultDoor } from '@/src/widgets/organisms/VaultDropAnimation';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Image, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const GOLD = '#F2C35C';
const UP = '#4CC38A';
const FALLBACK_PRICE = 6000;

type StageSize = { w: number; h: number; inner: number; compact: boolean };
const StageContext = createContext<StageSize>({ w: 320, h: 420, inner: 280, compact: false });
const useStage = () => useContext(StageContext);

/** Karanlık sahne: telefonun genişliğine ve yüksekliğine göre büyür; demolar her temada aynı görünür. */
function Stage({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const w = Math.min(width - 40, 380);
  const h = Math.max(340, Math.min(Math.round(height * 0.53), 480));
  const size: StageSize = { w, h, inner: w - paddings.lg * 2, compact: h < 410 };
  return (
    <StageContext.Provider value={size}>
      <View style={[styles.stage, { width: w, height: h }]}>{children}</View>
    </StageContext.Provider>
  );
}

/** Döngüde tekrar eden ilerleme değeri (0→1). Hareket azaltma açıksa son karede durur. */
function useLoop(durationMs: number, holdMs = 0) {
  const reduce = useReducedMotion();
  const progress = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    progress.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.cubic) }),
          withDelay(holdMs, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
  }, [reduce, durationMs, holdMs, progress]);
  return progress;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedText = Animated.createAnimatedComponent(Text);
const DOWN = '#FF6B6B';
const WOBBLE = [0, 0.4, 0.9, 0.6, 1.3, 1.1, 1.8, 1.5];

/** 1. Canlı fiyat: arkada nabız gibi atan ışıma, her güncellemede renk yanıp sönen rakam, değişim rozeti, çizilen grafik ve parlayan uç nokta. */
export function LivePriceDemo() {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const base = useGramAskPrice() ?? FALLBACK_PRICE;
  const gram = getGoldAsset('gram-24');
  const { w } = useStage();
  const wide = useWide(w, 115);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [reduce]);
  // Gerçek fiyat etrafında küçük oynama (yalnızca gösterim).
  const scale = base / 6000;
  const price = base + WOBBLE[tick % 8] * scale;
  const prev = base + WOBBLE[(tick + 7) % 8] * scale;
  const up = price >= prev;
  const delta = price - base;
  const pct = (delta / base) * 100;

  const flash = useSharedValue(0);
  const pop = useSharedValue(1);
  const draw = useLoop(2600, 700);
  const ring = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    flash.set(withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 650 })));
    pop.set(withSequence(withTiming(1.12, { duration: 100 }), withTiming(1, { duration: 260 })));
  }, [tick, reduce, flash, pop]);
  useEffect(() => {
    if (reduce) return;
    ring.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1));
  }, [reduce, ring]);

  const priceStyle = useAnimatedStyle(() => ({
    color: interpolateColor(flash.get(), [0, 1], ['#F2EEE6', up ? UP : DOWN]),
    transform: [{ scale: pop.get() }],
  }));
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: wide.dash * (1 - draw.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: draw.get() * 0.9 }));
  const dotProps = useAnimatedProps(() => ({ opacity: draw.get() > 0.96 ? 1 : 0 }));
  const ringOpacity = useAnimatedProps(() => ({ r: 6 + ring.get() * 16, opacity: draw.get() > 0.96 ? (1 - ring.get()) * 0.8 : 0 }));

  return (
    <Stage>
      <View style={styles.liveHeader}>
        {gram ? <GoldAssetIcon asset={gram} size={44} /> : null}
        <View>
          <Text style={styles.lightBig}>Gram altın</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.live}>CANLI</Text>
          </View>
        </View>
      </View>
      <View style={styles.priceBlock}>
        <AnimatedText style={[styles.big, priceStyle]}>{formatTRY(price)}</AnimatedText>
        <View style={[styles.deltaPill, { backgroundColor: up ? 'rgba(76,195,138,0.18)' : 'rgba(255,107,107,0.18)' }]}>
          <Text style={[styles.deltaText, { color: up ? UP : DOWN }]}>
            {`${up ? '▲' : '▼'} ${delta >= 0 ? '+' : '−'}${formatNumber(Math.abs(delta))} ₺  ·  %${formatNumber(Math.abs(pct))}`}
          </Text>
        </View>
        <View style={styles.clockRow}>
          <ClockIcon color={GOLD} size={14} />
          <Text style={styles.clock}>{formatClockTime(now)}</Text>
        </View>
      </View>
      <Svg width={wide.width} height={wide.height} viewBox={wide.viewBox} fill="none" style={[styles.chartFull, { left: wide.left, bottom: 36 }]}>
        <Defs>
          <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={UP} stopOpacity="0.45" />
            <Stop offset="1" stopColor={UP} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <AnimatedPath
          d={`M${wide.x0} 118 L-10 116 L26 102 L52 108 L80 80 L104 88 L132 60 L158 70 L186 46 L214 54 L240 28 L260 14 L${wide.x1} 6 L${wide.x1} 118 Z`}
          fill="url(#area)"
          animatedProps={areaProps}
        />
        <AnimatedPath
          d={`M${wide.x0} 118 L-10 116 L26 102 L52 108 L80 80 L104 88 L132 60 L158 70 L186 46 L214 54 L240 28 L260 14 L${wide.x1} 6`}
          stroke={UP}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={wide.dash}
          animatedProps={lineProps}
        />
        <AnimatedCircle cx={240} cy={28} fill={UP} animatedProps={ringOpacity} />
        <AnimatedCircle cx={240} cy={28} r={5.5} fill="#FFFFFF" animatedProps={dotProps} />
      </Svg>
    </Stage>
  );
}

/**
 * Kenardan kenara grafik: çizim alanı sahneden her iki yanda `WIDE_EXTRA` piksel taşar (sahne taşanı keser),
 * çizgi de aynı oranda uzatılır; böylece çizgi sahnenin en soluna ve en sağına kadar eksiksiz gider.
 */
const WIDE_EXTRA = 70;
function useWide(w: number, vbH: number) {
  const k = (w + 2) / 270;
  const eu = WIDE_EXTRA / k;
  return {
    width: w + 2 + WIDE_EXTRA * 2,
    left: -1 - WIDE_EXTRA,
    height: ((w + 2) * vbH) / 270,
    viewBox: `${-10 - eu} 0 ${270 + 2 * eu} ${vbH}`,
    x0: -10 - eu,
    x1: 260 + eu,
    dash: Math.ceil(340 + 2 * eu + 30),
  };
}

const VAULT_PERIOD = 5600;

/** Kasaya giren nesneler: düşme gecikmesi ve eklenen gram (çeyrek 1,75 g, külçe 5 g). */
const DROPS = [
  { delay: 650, grams: 1.75 },
  { delay: 1150, grams: 5 },
  { delay: 1650, grams: 1.75 },
] as const;
const BASE_GRAMS = 10;
const GOLD_PALETTE = { fill: '#E3B23C', edge: '#9A6B12', shine: '#FBE7A1' };

/** Nesne rafa inince panelin üstünde yükselip sönen "+X g" etiketi. */
function GainChip({ delay, label }: { delay: number; label: string }) {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(delay + 520, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })),
          withDelay(VAULT_PERIOD - delay - 1421, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
  }, [reduce, delay, p]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    return { opacity: v <= 0 ? 0 : v < 0.2 ? v / 0.2 : 1 - (v - 0.2) / 0.8, transform: [{ translateY: -v * 34 }, { scale: 0.85 + Math.min(v * 4, 1) * 0.15 }] };
  });
  return (
    <Animated.View style={[styles.gainChip, style]} pointerEvents="none">
      <Text style={styles.gainChipText}>{label}</Text>
    </Animated.View>
  );
}

/** Kasa kapanınca çıkan parıltı: dışa yayılan altın noktalar. */
function Sparkle({ pulse, angle }: { pulse: SharedValue<number>; angle: number }) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const p = pulse.get();
    const rad = (angle * Math.PI) / 180;
    return {
      opacity: p <= 0 ? 0 : 1 - p,
      transform: [{ translateX: Math.cos(rad) * 70 * p }, { translateY: Math.sin(rad) * 70 * p }, { scale: 1 - p * 0.5 }],
    };
  });
  return <Animated.View style={[styles.sparkle, style]} />;
}

/**
 * Kasanın içine demo alanının dışından (yukarıdan, sağdan, soldan) dönerek uçup gelen nesne. İnişte
 * hafifçe aşıp geri yaylanır, kendi gecikmesiyle girer, döngü sonunda sıfırlanır.
 */
function FlyIntoVault({
  delay,
  left,
  rest,
  from,
  spin,
  children,
}: {
  delay: number;
  left: number;
  rest: number;
  /** Başlangıç konumunun kasaya göre uzaklığı (demo alanının dışında kalır). */
  from: { x: number; y: number };
  spin: number;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    p.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(delay, withTiming(1, { duration: 620, easing: Easing.out(Easing.back(1.4)) })),
          withDelay(VAULT_PERIOD - delay - 621, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
  }, [reduce, delay, p]);
  const style = useAnimatedStyle(() => {
    const v = p.get();
    const rest0 = 1 - v;
    return {
      opacity: v <= 0 ? 0 : 1,
      transform: [
        { translateX: from.x * rest0 },
        { translateY: rest + from.y * rest0 - Math.sin(Math.PI * Math.min(1, Math.max(0, v))) * 26 },
        { rotate: `${spin * rest0}deg` },
        { scale: 0.65 + 0.35 * Math.min(1, v) },
      ],
    };
  });
  return <Animated.View style={[styles.dropItem, { left }, style]}>{children}</Animated.View>;
}

/** 2. Kasa: kapı açılır, içi görünür, altın nesneler sırayla girer, kapı kapanır, toplam değer ve kazanç yükselir. */
export function VaultDemo() {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const price = useGramAskPrice() ?? FALLBACK_PRICE;
  const door = useSharedValue(1);
  const pulse = useSharedValue(0);
  const bounce = useSharedValue(1);
  const lastGrams = BASE_GRAMS + DROPS.reduce((sum, d) => sum + d.grams, 0);
  const [grams, setGrams] = useState(reduce ? lastGrams : BASE_GRAMS);
  useEffect(() => {
    if (reduce) return;
    door.set(
      withRepeat(
        withSequence(
          withDelay(300, withTiming(0.1, { duration: 360 })),
          withDelay(1900, withTiming(1, { duration: 320 })),
          withDelay(VAULT_PERIOD - 2880, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    // Kapı kapanınca: parıltı halkası ve kasanın hafifçe sarsılması.
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(2880, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) })),
          withDelay(VAULT_PERIOD - 3441, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    bounce.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withDelay(2880, withTiming(0.94, { duration: 90 })),
          withTiming(1, { duration: 200, easing: Easing.out(Easing.back(2.5)) }),
          withDelay(VAULT_PERIOD - 3171, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    // Her nesne rafa inince toplam gram ve kazanç adım adım artar.
    const start = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - start) % VAULT_PERIOD;
      const added = DROPS.reduce((sum, d) => {
        const k = Math.min(1, Math.max(0, (t - d.delay - 460) / 650));
        return sum + d.grams * (1 - Math.pow(1 - k, 3));
      }, 0);
      setGrams(BASE_GRAMS + added);
    }, 60);
    return () => clearInterval(id);
  }, [reduce, door, pulse, bounce]);
  const doorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -DOOR.width / 2 }, { scaleX: door.get() }, { translateX: DOOR.width / 2 }],
  }));
  const bounceStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1.1 * bounce.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: pulse.get() <= 0 ? 0 : (1 - pulse.get()) * 0.9,
    transform: [{ scale: 0.4 + pulse.get() * 1.9 }],
  }));
  const value = price * grams;
  const gainValue = value - value / 1.16;
  return (
    <Stage>
      <View style={styles.vaultScale}>
        <Animated.View style={[styles.vaultWrap, bounceStyle]}>
          <Vault />
          <FlyIntoVault delay={DROPS[0].delay} left={58} rest={92} from={{ x: -300, y: -150 }} spin={-300}>
            <Coin />
          </FlyIntoVault>
          <FlyIntoVault delay={DROPS[1].delay} left={68} rest={100} from={{ x: 320, y: -90 }} spin={200}>
            <Bar palette={GOLD_PALETTE} />
          </FlyIntoVault>
          <FlyIntoVault delay={DROPS[2].delay} left={84} rest={86} from={{ x: 30, y: -300 }} spin={360}>
            <Coin />
          </FlyIntoVault>
          <Animated.View style={[styles.door, doorStyle]}>
            <VaultDoor />
          </Animated.View>
          <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <Sparkle key={deg} pulse={pulse} angle={deg} />
          ))}
        </Animated.View>
      </View>
      <View style={styles.panelWrap}>
        <View style={styles.chips}>
          {DROPS.map((d) => (
            <GainChip key={d.delay} delay={d.delay} label={`+${formatNumber(d.grams)} g`} />
          ))}
        </View>
      <View style={styles.panel}>
        <View style={styles.flex}>
          <Text style={styles.panelLabel} numberOfLines={1}>{`KASAM · ${formatNumber(grams)} gram altın`}</Text>
          <Text style={styles.panelValue} numberOfLines={1}>{formatTRY(value)}</Text>
        </View>
        <View style={styles.gainPill}>
          <Text style={styles.gain}>{`+${formatTRY(gainValue)}`}</Text>
          <Text style={styles.gainSub}>%16 kazanç</Text>
        </View>
      </View>
      </View>
    </Stage>
  );
}

const ALARM_PERIOD = 5000;
const alarmPath = (x0: number, x1: number) =>
  `M${x0} 146 L-10 140 L20 128 L48 134 L78 108 L104 114 L134 86 L160 94 L190 64 L216 72 L244 42 L262 30 L${x1} 22`;

/** 3. Alarm: fiyat sahnenin solundan sağına tırmanır, hedef çizgisini aşınca halka patlar ve bildirim üstten kayar. */
export function AlarmDemo() {
  const styles = useStyles();
  const price = useGramAskPrice() ?? FALLBACK_PRICE;
  const target = Math.round(price * 1.03 * 100) / 100;
  const { w, h } = useStage();
  const gram = getGoldAsset('gram-24');
  const reduce = useReducedMotion();
  const line = useSharedValue(reduce ? 1 : 0);
  const banner = useSharedValue(reduce ? 1 : 0);
  const burst = useSharedValue(reduce ? 1 : 0);
  const march = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    line.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.cubic) }),
          withDelay(ALARM_PERIOD - 2501, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    burst.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(2300, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })),
          withDelay(ALARM_PERIOD - 3201, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    banner.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(2500, withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.4)) })),
          withDelay(1700, withTiming(0, { duration: 320 })),
          withDelay(ALARM_PERIOD - 4921, withTiming(0, { duration: 1 })),
        ),
        -1,
      ),
    );
    march.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1));
  }, [reduce, line, banner, burst, march]);
  const wide = useWide(w, 151);
  // Hedef çizgisinin sahnedeki yüksekliği (grafik tabandan 36 px yukarıda); etiket çizginin tam üstünde, çizgiyi keserek durur.
  const labelTop = h - 36 - wide.height + (40 / 151) * wide.height - 9;
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: wide.dash * (1 - line.get()) }));
  const areaProps = useAnimatedProps(() => ({ opacity: line.get() * 0.9 }));
  const targetProps = useAnimatedProps(() => ({
    strokeDashoffset: -12 * march.get(),
    strokeWidth: 2 + (burst.get() > 0 && burst.get() < 0.5 ? burst.get() * 3 : 0),
    opacity: 0.55 + Math.min(burst.get() * 2, 1) * 0.45,
  }));
  const ringProps = useAnimatedProps(() => ({ r: 6 + burst.get() * 34, opacity: burst.get() <= 0 ? 0 : (1 - burst.get()) * 0.85 }));
  const dotProps = useAnimatedProps(() => ({ opacity: line.get() > 0.94 ? 1 : 0 }));
  const bannerStyle = useAnimatedStyle(() => ({ opacity: banner.get(), transform: [{ translateY: (banner.get() - 1) * 70 }] }));
  return (
    <Stage>
      <Animated.View style={[styles.banner, bannerStyle]}>
        <View style={styles.bannerIcon}>
          <BellIcon color="#14181F" size={18} filled />
        </View>
        <View style={styles.flex}>
          <Text style={styles.bannerTitle}>Gram Altın Alarmı Tetiklendi</Text>
          <Text style={styles.bannerBody}>{`Güncel Fiyat ${formatNumber(target)}`}</Text>
        </View>
      </Animated.View>
      <View style={styles.alarmInfo}>
        <View style={styles.alarmHead}>
          {gram ? <GoldAssetIcon asset={gram} size={40} /> : null}
          <View style={styles.flex}>
            <Text style={styles.lightBig}>Gram altın</Text>
            <Text style={styles.alarmNow}>{`Şu an ${formatTRY(price)}`}</Text>
          </View>
          <View style={styles.armed}>
            <BellIcon color={GOLD} size={14} filled />
            <Text style={styles.armedText}>Alarm kurulu</Text>
          </View>
        </View>
        <View style={styles.alarmChips}>
          {[1, 3, 5].map((p) => (
            <View key={p} style={[styles.alarmChip, p === 3 && styles.alarmChipOn]}>
              <Text style={[styles.alarmChipText, p === 3 && styles.alarmChipTextOn]}>{`+%${p}`}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.alarmTargetBig}>{formatTRY(target)}</Text>
      </View>
      <Text style={[styles.targetLabel, { top: labelTop }]}>Hedef</Text>
      <Svg width={wide.width} height={wide.height} viewBox={wide.viewBox} fill="none" style={[styles.chartFull, { left: wide.left, bottom: 36 }]}>
        <Defs>
          <LinearGradient id="alarmArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={UP} stopOpacity="0.4" />
            <Stop offset="1" stopColor={UP} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <AnimatedPath d={`${alarmPath(wide.x0, wide.x1)} L${wide.x1} 152 L${wide.x0} 152 Z`} fill="url(#alarmArea)" animatedProps={areaProps} />
        <AnimatedPath d={`M${wide.x0} 40 L${wide.x1} 40`} stroke={GOLD} strokeDasharray="6 6" animatedProps={targetProps} />
        <AnimatedPath
          d={alarmPath(wide.x0, wide.x1)}
          stroke={UP}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={wide.dash}
          animatedProps={lineProps}
        />
        <AnimatedCircle cx={247} cy={40} fill="none" stroke={GOLD} strokeWidth={3} animatedProps={ringProps} />
        <AnimatedCircle cx={247} cy={40} r={6} fill={GOLD} animatedProps={dotProps} />
      </Svg>
    </Stage>
  );
}

const CAL_PERIOD = 4200;

const FALLBACK_EVENTS: { id: string; country: 'TR' | 'US'; title: string; time: string }[] = [
  { id: 'a', country: 'TR', title: 'TCMB faiz kararı', time: '14:00' },
  { id: 'b', country: 'US', title: 'ABD enflasyon (TÜFE)', time: '15:30' },
  { id: 'c', country: 'US', title: 'Fed faiz kararı', time: '21:00' },
];

/** 4. Makro takvim: yaklaşan açıklamalar, geri sayım ve karar anında fiyat sıçraması. */
export function CalendarDemo() {
  const styles = useStyles();
  const { inner } = useStage();
  const { events } = useEconomicCalendar();
  const rows =
    events.length >= 2
      ? events.slice(0, 3).map((e) => ({
          id: e.id,
          country: e.country,
          title: e.title,
          time: new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }).format(new Date(e.at)),
        }))
      : FALLBACK_EVENTS;
  const reduce = useReducedMotion();
  const line = useSharedValue(reduce ? 1 : 0);
  const flash = useSharedValue(0);
  const [sec, setSec] = useState(3);
  useEffect(() => {
    if (reduce) return;
    line.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 3200, easing: Easing.linear }),
          withDelay(CAL_PERIOD - 3201, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    flash.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(1900, withTiming(1, { duration: 120 })),
          // "Karar anı" etiketi döngü bitene kadar görünür kalır.
          withDelay(CAL_PERIOD - 2020, withTiming(1, { duration: 1 })),
        ),
        -1,
      ),
    );
    const id = setInterval(() => setSec((s) => (s <= 0 ? 3 : s - 1)), CAL_PERIOD / 4);
    return () => clearInterval(id);
  }, [reduce, line, flash]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: 280 * (1 - line.get()) }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  return (
    <Stage>
      <Text style={styles.calHeader}>BU HAFTA · PİYASAYI OYNATABİLECEKLER</Text>
      <View style={styles.rows}>
        {rows.map((r, i) => (
          <View key={r.id} style={[styles.evRow, i === 0 && styles.evRowFirst]}>
            <FlagIcon country={r.country} width={24} />
            <Text style={styles.evTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {r.title}
            </Text>
            <Text style={i === 0 ? styles.evCountdown : styles.evTime}>
              {i === 0 ? `00:00:0${Math.max(sec, 0)}` : r.time}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.chartBox, { marginTop: 30 }]}>
        <Svg width={inner} height={inner * 0.4} viewBox="0 0 250 120" fill="none">
          <AnimatedPath
            d="M4 70 L40 68 L70 72 L100 69 L128 70 L140 64 L152 20 L166 52 L182 28 L214 36 L246 30"
            stroke={GOLD}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="280"
            animatedProps={props}
          />
        </Svg>
        <Animated.View style={[styles.spikeTag, flashStyle]}>
          <Text style={styles.spikeText}>Karar anı</Text>
        </Animated.View>
      </View>
      <View style={[styles.reportRow, styles.reportAbs]}>
        <Text style={styles.reportText}>Açıklama sonrası analiz raporu</Text>
        <ProMark />
      </View>
    </Stage>
  );
}

const NEWS_PERIOD = 8200;

type NewsItem = {
  image: ImageSourcePropType;
  source: string;
  initial: string;
  accent: string;
  time: string;
  headline: string;
  tone: 'up' | 'down' | 'neutral';
  label: string;
  /** Olumlu yöndeki haber analizi payı (0..1), çubuk bu kadar dolar. */
  score: number;
  breaking?: boolean;
};

const NEWS: NewsItem[] = [
  {
    image: require('@/assets/images/onboarding/news-rate.png'),
    source: 'Piyasa Gündemi',
    initial: 'P',
    accent: '#E3B23C',
    time: 'şimdi',
    headline: 'Merkez bankası faiz kararını açıkladı: altında sert hareket',
    tone: 'up',
    label: 'Altın için olumlu ↑',
    score: 0.78,
    breaking: true,
  },
  {
    image: require('@/assets/images/onboarding/news-chart.png'),
    source: 'Küresel Piyasalar',
    initial: 'K',
    accent: '#5B8DEF',
    time: '2 sa önce',
    headline: 'Dolar endeksi güçlendi, ons altın baskı altında',
    tone: 'down',
    label: 'Olumsuz ↓',
    score: 0.24,
  },
  {
    image: require('@/assets/images/onboarding/news-gold.png'),
    source: 'Altın Bülteni',
    initial: 'A',
    accent: '#4CC38A',
    time: 'Dün',
    headline: 'Gram altında haftalık toparlanma sürüyor',
    tone: 'neutral',
    label: 'Nötr',
    score: 0.52,
  },
];

const clamp01 = (v: number) => {
  'worklet';
  return Math.min(1, Math.max(0, v));
};

/** Haber akışı kartı: sahibi, zamanı, başlığı, görseli ve "haber analizi" çubuğu. Zaman çizelgesi `clock` (ms) ile sürülür. */
function FeedCard({ clock, item, index, big }: { clock: SharedValue<number>; item: NewsItem; index: number; big?: boolean }) {
  const styles = useStyles();
  const inAt = 250 + index * 420;
  const stampAt = 1500 + index * 420;
  const cardStyle = useAnimatedStyle(() => {
    const p = clamp01((clock.get() - inAt) / 480);
    return { opacity: p, transform: [{ translateY: (1 - p) * 26 }] };
  });
  const stampStyle = useAnimatedStyle(() => {
    const p = clamp01((clock.get() - stampAt) / 360);
    return { opacity: p, transform: [{ scale: 1.7 - 0.7 * p }, { rotate: `${(1 - p) * -8}deg` }] };
  });
  const barStyle = useAnimatedStyle(() => ({ width: `${clamp01((clock.get() - stampAt) / 900) * item.score * 100}%` }));
  const blinkStyle = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * Math.abs(Math.sin(clock.get() / 260)) }));
  return (
    <Animated.View style={[styles.feedCard, cardStyle]}>
      <View style={styles.feedHead}>
        <View style={[styles.avatar, { backgroundColor: item.accent }]}>
          <Text style={styles.avatarText}>{item.initial}</Text>
        </View>
        <Text style={styles.feedSource}>{item.source}</Text>
        <Text style={styles.feedTime}>{`· ${item.time}`}</Text>
        {item.breaking ? (
          <Animated.View style={[styles.breaking, blinkStyle]}>
            <Text style={styles.breakingText}>SON DAKİKA</Text>
          </Animated.View>
        ) : null}
      </View>
      {big ? <Image source={item.image} style={styles.feedImage} resizeMode="cover" /> : null}
      <View style={styles.feedBody}>
        <View style={styles.flex}>
          <Text style={styles.feedHeadline} numberOfLines={2}>
            {item.headline}
          </Text>
          <View style={styles.analysisRow}>
            <Text style={styles.analysisLabel}>HABER ANALİZİ</Text>
            <View style={styles.track}>
              <Animated.View style={[styles.fill, { backgroundColor: item.tone === 'down' ? '#FF6B6B' : item.tone === 'neutral' ? '#9AA3B2' : UP }, barStyle]} />
            </View>
          </View>
        </View>
        {big ? null : <Image source={item.image} style={styles.thumb} resizeMode="cover" />}
      </View>
      <Animated.View style={[styles.stamp, { top: big ? 38 : 6 }, stampStyle]}>
        <Badge label={item.label} tone={item.tone} />
      </Animated.View>
    </Animated.View>
  );
}

/** 5. Haberler: gerçek bir haber akışı gibi görselli kartlar sırayla gelir, analiz çubuğu dolar, etki etiketi damgalanır, akış kayar; altta haftalık analiz kartı sabit durur. */
export function NewsDemo() {
  const styles = useStyles();
  const { h, inner } = useStage();
  const reduce = useReducedMotion();
  const clock = useSharedValue(reduce ? 4000 : 0);
  useEffect(() => {
    if (reduce) return;
    clock.set(
      withRepeat(
        withSequence(withTiming(0, { duration: 0 }), withTiming(NEWS_PERIOD, { duration: NEWS_PERIOD, easing: Easing.linear })),
        -1,
      ),
    );
  }, [reduce, clock]);
  const feedH = h - 134;
  const scrollStyle = useAnimatedStyle(() => {
    const k = clamp01((clock.get() - 4300) / 2300);
    const eased = 1 - Math.pow(1 - k, 3);
    return { transform: [{ translateY: -eased * 175 }] };
  });
  const weeklyStyle = useAnimatedStyle(() => {
    const p = clamp01((clock.get() - 2600) / 520);
    return { opacity: p, transform: [{ translateY: (1 - p) * 24 }] };
  });
  return (
    <Stage>
      <View style={[styles.feedWrap, { width: inner }]}>
        <View style={styles.feedTop}>
          <Text style={styles.feedTitle}>Haberler</Text>
          <View style={styles.chipRow}>
            {['Hepsi', 'Altın', 'Makro'].map((c, i) => (
              <View key={c} style={[styles.feedChip, i === 0 && styles.feedChipOn]}>
                <Text style={[styles.feedChipText, i === 0 && styles.feedChipTextOn]}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ height: feedH, overflow: 'hidden' }}>
          <Animated.View style={[styles.feedList, scrollStyle]}>
            <FeedCard clock={clock} item={NEWS[0]} index={0} big />
            <FeedCard clock={clock} item={NEWS[1]} index={1} />
            <FeedCard clock={clock} item={NEWS[2]} index={2} />
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[styles.reportRow, styles.reportAbs, weeklyStyle]}>
        <Text style={styles.reportText}>Güncel haftalık analiz</Text>
        <ProMark />
      </Animated.View>
    </Stage>
  );
}

const useStyles = makeStyles(() => ({
  stage: {
    borderRadius: 32,
    backgroundColor: '#12151B',
    borderWidth: 1,
    borderColor: 'rgba(242,195,92,0.35)',
    padding: paddings.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  flex: { flex: 1 },
  stageMuted: { color: '#9AA3B2', letterSpacing: 1.2, fontWeight: '700' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  light: { color: '#F2EEE6' },
  lightBig: { color: '#F2EEE6', fontSize: 18, fontWeight: '800' },
  live: { color: '#9AA3B2', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  metalRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  metalText: { width: '100%', textAlign: 'center', color: '#9AA3B2', fontSize: 11 },
  vaultScale: { width: VAULT * 1.1, height: VAULT * 1.1, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  panelWrap: { alignSelf: 'stretch' },
  chips: { position: 'absolute', top: -6, right: 10, height: 0, alignItems: 'flex-end', zIndex: 4 },
  gainChip: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: UP,
  },
  gainChipText: { color: '#0B1A12', fontSize: 12, fontWeight: '800' },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    height: 68,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  panelLabel: { color: '#9AA3B2', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  panelValue: { color: '#F2EEE6', fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  gainPill: { alignItems: 'flex-end', minWidth: 112 },
  gainSub: { color: UP, fontSize: 11, fontWeight: '700' },
  calHeader: { color: '#9AA3B2', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  rows: { alignSelf: 'stretch', gap: 8 },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(242,195,92,0.5)',
  },
  reportAbs: { position: 'absolute', left: 16, right: 16, bottom: 14, alignSelf: 'auto' },
  reportText: { color: GOLD, fontSize: 13, fontWeight: '700' },
  evRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  evRowFirst: { backgroundColor: 'rgba(242,195,92,0.18)', borderWidth: 1, borderColor: 'rgba(242,195,92,0.5)' },
  evTitle: { flex: 1, color: '#F2EEE6', fontSize: 15, fontWeight: '700' },
  evTime: { color: '#9AA3B2', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  evCountdown: { color: GOLD, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  feedWrap: { flex: 1, gap: 8 },
  feedTop: { height: 48, justifyContent: 'center', gap: 6 },
  feedTitle: { color: '#F2EEE6', fontSize: 16, fontWeight: '800' },
  chipRow: { flexDirection: 'row', gap: 6 },
  feedChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  feedChipOn: { backgroundColor: GOLD },
  feedChipText: { color: '#9AA3B2', fontSize: 11, fontWeight: '700' },
  feedChipTextOn: { color: '#14181F' },
  feedList: { gap: 8 },
  feedCard: { padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', gap: 8 },
  feedHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#14181F', fontSize: 11, fontWeight: '900' },
  feedSource: { color: '#F2EEE6', fontSize: 12, fontWeight: '800' },
  feedTime: { color: '#9AA3B2', fontSize: 11 },
  breaking: { marginLeft: 'auto', backgroundColor: '#E5484D', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  breakingText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  feedImage: { height: 112, borderRadius: 12, width: '100%' },
  feedBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedHeadline: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  analysisRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  analysisLabel: { color: '#9AA3B2', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  track: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  stamp: { position: 'absolute', right: 10 },
  chartFull: { position: 'absolute', left: -1, bottom: -1 },
  priceBlock: { position: 'absolute', top: 112, left: 0, right: 0, alignItems: 'center', gap: 8 },
  deltaPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14 },
  deltaText: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  liveHeader: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: UP },
  big: { fontSize: 46, fontWeight: '800', color: '#F2EEE6', letterSpacing: -1 },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clock: { fontSize: 14, color: GOLD, fontVariant: ['tabular-nums'], fontWeight: '600' },
  vaultWrap: { width: VAULT, height: VAULT },
  dropItem: { position: 'absolute', top: 0, zIndex: 1 },
  ring: {
    position: 'absolute',
    left: VAULT / 2 - 55,
    top: DOOR.top + DOOR.height / 2 - 55,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: GOLD,
    zIndex: 3,
  },
  sparkle: {
    position: 'absolute',
    left: VAULT / 2 - 4,
    top: DOOR.top + DOOR.height / 2 - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFE28C',
    zIndex: 3,
  },
  door: { position: 'absolute', left: DOOR.left, top: DOOR.top, width: DOOR.width, height: DOOR.height, zIndex: 2 },
  gain: { color: UP, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  banner: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    zIndex: 3,
  },
  bannerIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { color: '#F2EEE6', fontSize: 13, fontWeight: '700' },
  bannerBody: { color: '#C5CBD6', fontSize: 12 },
  chartBox: { marginTop: 6 },
  targetLabel: {
    position: 'absolute',
    left: 14,
    paddingHorizontal: 6,
    backgroundColor: '#12151B',
    color: GOLD,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    zIndex: 2,
  },
  alarmInfo: { position: 'absolute', top: 84, left: 16, right: 16, gap: 12 },
  alarmHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alarmNow: { color: '#9AA3B2', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  armed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(242,195,92,0.16)',
  },
  armedText: { color: GOLD, fontSize: 11, fontWeight: '800' },
  alarmChips: { flexDirection: 'row', gap: 8 },
  alarmChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  alarmChipOn: { borderColor: GOLD, backgroundColor: 'rgba(242,195,92,0.18)' },
  alarmChipText: { color: '#9AA3B2', fontSize: 13, fontWeight: '800' },
  alarmChipTextOn: { color: GOLD },
  alarmTargetBig: {
    alignSelf: 'center',
    minWidth: 200,
    textAlign: 'center',
    color: UP,
    fontSize: 30,
    fontWeight: '800',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.25)',
    paddingBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'stretch',
  },
  eventTitle: { color: '#F2EEE6', fontSize: 15, fontWeight: '700' },
  eventMeta: { color: '#9AA3B2', fontSize: 12 },
  countdown: { color: GOLD, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  spikeTag: {
    position: 'absolute',
    left: 110,
    top: -6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: GOLD,
  },
  spikeText: { color: '#14181F', fontSize: 11, fontWeight: '800' },
}));
