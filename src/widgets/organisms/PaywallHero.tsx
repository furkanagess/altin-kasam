import { makeStyles } from '@/src/core/theme';
import { Coin } from '@/src/widgets/organisms/VaultDropAnimation';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

const GOLD = '#F2C35C';
const STAGE_BG = '#12151B';

/** Sürekli tekrar eden 0→1 ilerleme; hareket azaltma açıksa sabit `rest` değerinde durur. */
function useForever(durationMs: number, opts: { delay?: number; reverse?: boolean; linear?: boolean; rest?: number } = {}) {
  const reduce = useReducedMotion();
  const v = useSharedValue(opts.rest ?? 0);
  useEffect(() => {
    if (reduce) return;
    const easing = opts.linear ? Easing.linear : Easing.inOut(Easing.sin);
    // Hareket azaltma için verilen `rest` başlangıcından bağımsız olarak döngü her zaman 0→1 arasında akar.
    v.set(
      withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(opts.delay ?? 0, withRepeat(withTiming(1, { duration: durationMs, easing }), -1, opts.reverse ?? false)),
      ),
    );
  }, [reduce, durationMs, opts.delay, opts.reverse, opts.linear, v]);
  return v;
}

/** Sahnenin ortasından dışarı yayılan, yavaşça dönen ışık huzmeleri. */
function Rays({ size, spin }: { size: number; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  const c = size / 2;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const spread = 0.09;
    const x1 = c + Math.cos(a - spread) * c;
    const y1 = c + Math.sin(a - spread) * c;
    const x2 = c + Math.cos(a + spread) * c;
    const y2 = c + Math.sin(a + spread) * c;
    return `M${c} ${c} L${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  });
  return (
    <Animated.View style={[{ position: 'absolute', width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="ray" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={GOLD} stopOpacity={0.32} />
            <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {rays.map((d) => (
          <Path key={d} d={d} fill="url(#ray)" />
        ))}
      </Svg>
    </Animated.View>
  );
}

/** Ortadaki altın madalyon: hafifçe süzülür, üzerinden ışık geçer. */
function Medallion({ size, float, shine }: { size: number; float: SharedValue<number>; shine: SharedValue<number> }) {
  const styles = useStyles();
  const bob = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + float.get() * 12 }, { scale: 0.98 + float.get() * 0.04 }],
  }));
  const sweep = useAnimatedStyle(() => ({
    transform: [{ translateX: -size + shine.get() * size * 2.4 }, { rotate: '20deg' }],
  }));
  return (
    <Animated.View style={[{ width: size, height: size }, bob]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="medal" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FBE7A1" />
            <Stop offset="0.45" stopColor="#E3B23C" />
            <Stop offset="1" stopColor="#9A6B12" />
          </LinearGradient>
          <LinearGradient id="rim" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#7A520C" />
            <Stop offset="1" stopColor="#FBE7A1" />
          </LinearGradient>
        </Defs>
        <Circle cx={50} cy={50} r={48} fill="url(#rim)" />
        <Circle cx={50} cy={50} r={43} fill="url(#medal)" />
        <Circle cx={50} cy={50} r={36} fill="none" stroke="#9A6B12" strokeWidth={1.2} strokeDasharray="2 3" opacity={0.7} />
        <G opacity={0.9}>
          <Path d="M30 37 L38 45 L50 31 L62 45 L70 37 L66 58 L34 58 Z" fill="#7A520C" />
          <Circle cx={30} cy={36} r={3} fill="#7A520C" />
          <Circle cx={50} cy={30} r={3} fill="#7A520C" />
          <Circle cx={70} cy={36} r={3} fill="#7A520C" />
        </G>
      </Svg>
      <Text style={[styles.medalText, { top: size * 0.6, fontSize: size * 0.15 }]}>PRO</Text>
      <View style={[styles.medalClip, { borderRadius: size / 2 }]} pointerEvents="none">
        <Animated.View style={[styles.shine, { height: size * 1.6, top: -size * 0.3 }, sweep]} />
      </View>
    </Animated.View>
  );
}

/** Madalyonun etrafında süzülen sikke. */
function FloatingCoin({ x, y, scale, delay }: { x: number; y: number; scale: number; delay: number }) {
  const t = useForever(2400, { delay, reverse: true, rest: 0.5 });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -8 + t.get() * 16 }, { rotate: `${-12 + t.get() * 24}deg` }, { scale }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]} pointerEvents="none">
      <Coin />
    </Animated.View>
  );
}

/** Dört köşeli parıltı; sırayla yanıp söner. */
function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 0.6 : 0);
  useEffect(() => {
    if (reduce) return;
    t.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
            withTiming(0, { duration: 1400 }),
          ),
          -1,
        ),
      ),
    );
  }, [reduce, delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get(),
    transform: [{ scale: 0.4 + t.get() * 0.8 }, { rotate: `${t.get() * 45}deg` }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y }, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 0 C13 9 15 11 24 12 C15 13 13 15 12 24 C11 15 9 13 0 12 C9 11 11 9 12 0 Z" fill="#FBE7A1" />
      </Svg>
    </Animated.View>
  );
}

/**
 * Paywall'un üstündeki karanlık sahne: onboarding demolarıyla aynı dil — dönen ışık huzmeleri,
 * nabız gibi atan ışıma, süzülen altın madalyon, etrafında sikkeler ve parıltılar.
 */
export function PaywallHero({ width, height }: { width: number; height: number }) {
  const styles = useStyles();
  const spin = useForever(28000, { linear: true });
  const pulse = useForever(2200, { reverse: true, rest: 0.5 });
  const float = useForever(2600, { reverse: true, rest: 0.5 });
  const shine = useForever(3200, { delay: 600, rest: 0 });

  const medal = Math.round(Math.min(height * 0.56, 132));
  const raySize = Math.max(width, height) * 1.5;
  const glowSize = medal * 2.4;
  const glow = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.get() * 0.45,
    transform: [{ scale: 0.88 + pulse.get() * 0.2 }],
  }));
  const coinScale = Math.max(0.6, Math.min(1, height / 230));
  const cx = width / 2;
  const cy = height / 2;

  return (
    <View style={[styles.stage, { width, height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rays size={raySize} spin={spin} />
      <Animated.View style={[{ position: 'absolute', width: glowSize, height: glowSize }, glow]} pointerEvents="none">
        <Svg width={glowSize} height={glowSize}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={GOLD} stopOpacity={0.55} />
              <Stop offset="0.5" stopColor={GOLD} stopOpacity={0.14} />
              <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize / 2} fill="url(#glow)" />
        </Svg>
      </Animated.View>

      <FloatingCoin x={cx - medal * 1.35} y={cy - medal * 0.55} scale={coinScale * 0.85} delay={0} />
      <FloatingCoin x={cx + medal * 0.85} y={cy - medal * 0.75} scale={coinScale * 0.7} delay={700} />
      <FloatingCoin x={cx + medal * 0.95} y={cy + medal * 0.2} scale={coinScale} delay={1300} />

      <Sparkle x={cx - medal * 0.9} y={cy + medal * 0.35} size={14} delay={0} />
      <Sparkle x={cx + medal * 0.4} y={cy - medal * 0.75} size={18} delay={900} />
      <Sparkle x={cx - medal * 0.35} y={cy - medal * 0.85} size={10} delay={1600} />
      <Sparkle x={cx + medal * 1.5} y={cy + medal * 0.05} size={12} delay={2100} />

      <Medallion size={medal} float={float} shine={shine} />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  stage: {
    borderRadius: 28,
    backgroundColor: STAGE_BG,
    borderWidth: 1,
    borderColor: 'rgba(242,195,92,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  medalText: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#4A3206',
    fontWeight: '900',
    letterSpacing: 2,
  },
  medalClip: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  shine: { position: 'absolute', width: 22, backgroundColor: 'rgba(255,255,255,0.45)' },
}));
