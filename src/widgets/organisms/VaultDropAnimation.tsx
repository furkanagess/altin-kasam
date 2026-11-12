import type { Currency } from '@/src/core/constants/app';
import { getGoldAsset } from '@/src/core/constants/goldAssets';
import { getOtherAsset } from '@/src/core/constants/portfolioAssets';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { feedbackDatasource } from '@/src/data/datasources/feedbackDatasource';
import { GoldForm, MetalSymbol } from '@/src/domain/enums';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';

type Props = {
  /** Ör. "Kasaya eklendi". */
  title: string;
  /** Ör. "2 çeyrek · ₺21.300". */
  subtitle?: string;
  /** Eklenen ya da çıkarılan varlık; nesne buna göre seçilir (sikke, külçe, bilezik, banknot). */
  assetId?: string;
  /** `deposit`: nesne kasaya düşer (varsayılan). `withdraw`: nesne kasadan yukarı çıkar. */
  mode?: 'deposit' | 'withdraw';
  /** Animasyon bitince (otomatik) çağrılır. */
  onDone: () => void;
};

type Palette = { fill: string; edge: string; shine: string };

/** Külçe renkleri `MetalIcon` ile aynı. */
const METAL_PALETTES: Record<MetalSymbol, Palette> = {
  [MetalSymbol.XAU]: { fill: '#E3B23C', edge: '#9A6B12', shine: '#FBE7A1' },
  [MetalSymbol.XAG]: { fill: '#C9CED6', edge: '#6F7886', shine: '#F4F6F9' },
  [MetalSymbol.XPT]: { fill: '#AEB8C4', edge: '#4F5B69', shine: '#E6ECF2' },
  [MetalSymbol.XPD]: { fill: '#BDB5A8', edge: '#665D50', shine: '#EEE9E1' },
};

const NOTE_COLORS: Record<Currency, { fill: string; edge: string; ink: string }> = {
  USD: { fill: '#CFE8D6', edge: '#2E7D4F', ink: '#1F5C39' },
  EUR: { fill: '#D6E4F5', edge: '#3B6FB6', ink: '#24497E' },
  TRY: { fill: '#F1D7E0', edge: '#9C3E60', ink: '#6E2541' },
};

type DropItem =
  | { kind: 'coin' }
  | { kind: 'bracelet' }
  | { kind: 'bar'; palette: Palette }
  | { kind: 'note'; currency: Currency; symbol: string };

/** Ziynet altınlar sikke, gram altın ve metaller külçe, bilezik halka, nakit banknot olarak düşer. */
function dropItemOf(assetId: string | undefined): DropItem {
  const gold = assetId ? getGoldAsset(assetId) : undefined;
  if (gold) {
    if (gold.form === GoldForm.Gram) return { kind: 'bar', palette: METAL_PALETTES[MetalSymbol.XAU] };
    if (gold.form === GoldForm.Bilezik) return { kind: 'bracelet' };
    return { kind: 'coin' };
  }
  const other = assetId ? getOtherAsset(assetId) : undefined;
  if (other?.kind === 'metal') return { kind: 'bar', palette: METAL_PALETTES[other.metal] };
  if (other?.kind === 'cash') return { kind: 'note', currency: other.currency, symbol: other.symbol };
  return { kind: 'coin' };
}

export const VAULT = 170;
/** Kapı (ve açıklık) ölçüleri; gövde çiziminin içindeki açıklıkla aynı. */
export const DOOR = { left: 22, top: 34, width: 126, height: 108 };
/** Kapı açılırken menteşe (sol kenar) sabit kalır, kapı yana doğru daralır. */
const DOOR_OPEN_SCALE = 0.1;
const DOOR_OPEN_MS = 360;
const DOOR_CLOSE_MS = 300;
/** Nesne düşmeden önce kapının açılması beklenir. */
const DOOR_OPEN_DELAY_MS = 180;
/** Nesnenin kasa içindeki duruş yüksekliği ve çıkarken kaybolduğu yükseklik (sahne üstünden). */
export const INSIDE_Y = 72;
export const START_Y = -190;
const OUT_Y = -150;
/** Düşüş: kapı açıldıktan sonra başlar; ses ve titreşim iniş anına göre zamanlanır. */
const DROP_DELAY_MS = DOOR_OPEN_DELAY_MS + DOOR_OPEN_MS - 80;
const DROP_MS = 520;
const LANDED_AT_MS = DROP_DELAY_MS + DROP_MS;
const CLOSE_DELAY_MS = LANDED_AT_MS + 140;
const CLOSED_AT_MS = CLOSE_DELAY_MS + DOOR_CLOSE_MS;
const HOLD_AFTER_DONE_MS = 1_200;
/** Çıkarma: kapı açılır, nesne kasadan yükselip kaybolur, kapı kapanır. */
const RISE_DELAY_MS = DOOR_OPEN_DELAY_MS + DOOR_OPEN_MS - 60;
const RISE_MS = 560;
const RISEN_AT_MS = RISE_DELAY_MS + RISE_MS;
const WITHDRAW_CLOSE_DELAY_MS = RISEN_AT_MS + 60;
const WITHDRAW_CLOSED_AT_MS = WITHDRAW_CLOSE_DELAY_MS + DOOR_CLOSE_MS;
const REDUCED_HOLD_MS = 1_100;

/** Uygulama ikonuyla aynı: altın gövde, koyu iç açıklık. */
export function Vault() {
  return (
    <Svg width={VAULT} height={VAULT} viewBox="0 0 170 170">
      <Defs>
        <LinearGradient id="vbody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE29A" />
          <Stop offset="1" stopColor="#C9922B" />
        </LinearGradient>
<LinearGradient id="vwall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2B3445" />
          <Stop offset="1" stopColor="#171C26" />
        </LinearGradient>
        <LinearGradient id="vfloor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3A4152" />
          <Stop offset="1" stopColor="#222835" />
        </LinearGradient>
        <ClipPath id="vopening">
          <Rect x={DOOR.left} y={DOOR.top} width={DOOR.width} height={DOOR.height} rx={16} />
        </ClipPath>
      </Defs>
      <Rect x={24} y={148} width={24} height={14} rx={3} fill="#96681E" />
      <Rect x={122} y={148} width={24} height={14} rx={3} fill="#96681E" />
      <Rect x={10} y={22} width={150} height={130} rx={26} fill="url(#vbody)" />
      {/* İç: arka duvar, yan duvarlar, tavan ve raf; kapı açılınca boşluk değil oda görünür. */}
      <G clipPath="url(#vopening)">
        <Rect x={22} y={34} width={126} height={108} fill="#0B0E13" />
        <Rect x={38} y={50} width={94} height={78} fill="url(#vwall)" />
        <Polygon points="22,34 148,34 132,50 38,50" fill="#07090D" />
        <Polygon points="22,34 38,50 38,128 22,142" fill="#10141B" />
        <Polygon points="148,34 132,50 132,128 148,142" fill="#10141B" />
        <Polygon points="22,142 148,142 132,128 38,128" fill="url(#vfloor)" />
        <Rect x={38} y={126} width={94} height={2.5} fill="#F2C35C" opacity={0.35} />
        <Rect x={46} y={58} width={78} height={3} rx={1.5} fill="#FFFFFF" opacity={0.06} />
        {/* Önceden duran içerik: nakit desteleri ve sikke yığınları. */}
        {[0, 1, 2, 3].map((i) => (
          <Rect key={`a${i}`} x={40} y={124 - i * 6} width={24} height={6} rx={1} fill={i % 2 ? '#5FB07F' : '#4E9A6E'} stroke="#2F6B49" strokeWidth={0.6} />
        ))}
        <Rect x={49} y={100} width={6} height={30} fill="#E8D5A8" opacity={0.9} />
        {[0, 1].map((i) => (
          <Rect key={`b${i}`} x={52} y={136 - i * 6} width={22} height={6} rx={1} fill={i % 2 ? '#4E9A6E' : '#3F8F66'} stroke="#2F6B49" strokeWidth={0.6} />
        ))}
        <Rect x={60} y={126} width={5} height={14} fill="#E8D5A8" opacity={0.9} />
        {[0, 1, 2, 3].map((i) => (
          <Ellipse key={`c${i}`} cx={122} cy={134 - i * 4} rx={11} ry={3.6} fill="#E3B23C" stroke="#9A6B12" strokeWidth={0.9} />
        ))}
        {[0, 1].map((i) => (
          <Ellipse key={`d${i}`} cx={104} cy={138 - i * 4} rx={10} ry={3.4} fill="#E3B23C" stroke="#9A6B12" strokeWidth={0.9} />
        ))}
      </G>
    </Svg>
  );
}

/** Kapı: koyu cam panel, parlayan kadran ve kol (uygulama ikonu). */
export function VaultDoor() {
  const cx = 58;
  const cy = 54;
  return (
    <Svg width={DOOR.width} height={DOOR.height} viewBox={`0 0 ${DOOR.width} ${DOOR.height}`}>
      <Defs>
        <LinearGradient id="vdoor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#262E3C" />
          <Stop offset="1" stopColor="#0F1319" />
        </LinearGradient>
        <LinearGradient id="vring" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE28C" />
          <Stop offset="1" stopColor="#E2A634" />
        </LinearGradient>
      </Defs>
      <Rect x={0.5} y={0.5} width={DOOR.width - 1} height={DOOR.height - 1} rx={16} fill="url(#vdoor)" stroke="#6B5A33" strokeWidth={1} />
      {Array.from({ length: 12 }, (_, i) => {
        const rad = (i * 30 * Math.PI) / 180;
        return (
          <Line
            key={i}
            x1={cx + Math.cos(rad) * 33}
            y1={cy + Math.sin(rad) * 33}
            x2={cx + Math.cos(rad) * 39}
            y2={cy + Math.sin(rad) * 39}
            stroke="#F2C35C"
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        );
      })}
      <Circle cx={cx} cy={cy} r={26} fill="none" stroke="url(#vring)" strokeWidth={5.5} />
      <Circle cx={cx} cy={cy} r={19} fill="#1B212C" />
      <Line x1={cx} y1={cy} x2={cx + 11} y2={cy - 13} stroke="#FFD978" strokeWidth={4} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={5.5} fill="#FFD978" />
      <Rect x={105} y={42} width={9} height={26} rx={4.5} fill="url(#vring)" />
    </Svg>
  );
}

export function Coin() {
  return (
    <Svg width={40} height={40} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={20} fill="#E3B23C" stroke="#9A6B12" strokeWidth={2.5} />
      <Circle
        cx={24}
        cy={24}
        r={14}
        fill="none"
        stroke="#9A6B12"
        strokeWidth={1.4}
        opacity={0.6}
        strokeDasharray="2 2"
      />
      <Polygon
        points="24,15 26.6,21 33,21 27.8,25 29.7,31.5 24,27.6 18.3,31.5 20.2,25 15,21 21.4,21"
        fill="#9A6B12"
        opacity={0.8}
      />
      <Path d="M12 18 A14 14 0 0 1 22 10" stroke="#FBE7A1" strokeWidth={3} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function Bar({ palette }: { palette: Palette }) {
  return (
    <Svg width={54} height={34} viewBox="0 0 54 34">
      <Polygon points="4,30 50,30 43,6 11,6" fill={palette.fill} stroke={palette.edge} strokeWidth={2.4} strokeLinejoin="round" />
      <Polygon points="11,6 43,6 41,12 13,12" fill={palette.shine} opacity={0.9} />
      <Path d="M10 25 H44" stroke={palette.edge} strokeWidth={1.4} strokeLinecap="round" opacity={0.45} />
    </Svg>
  );
}

function Bracelet() {
  const gold = METAL_PALETTES[MetalSymbol.XAU];
  return (
    <Svg width={50} height={36} viewBox="0 0 50 36">
      <Ellipse cx={25} cy={18} rx={21} ry={13} fill="none" stroke={gold.edge} strokeWidth={9} />
      <Ellipse cx={25} cy={18} rx={21} ry={13} fill="none" stroke={gold.fill} strokeWidth={6} />
      <Path d="M9 13 Q16 7 26 6" stroke={gold.shine} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function Banknote({ currency, symbol }: { currency: Currency; symbol: string }) {
  const c = NOTE_COLORS[currency];
  return (
    <Svg width={60} height={32} viewBox="0 0 60 32">
      <Rect x={1.5} y={1.5} width={57} height={29} rx={4} fill={c.fill} stroke={c.edge} strokeWidth={2} />
      <Rect x={6} y={6} width={48} height={20} rx={2} fill="none" stroke={c.edge} strokeWidth={1} opacity={0.5} />
      <Circle cx={30} cy={16} r={8} fill="#FFFFFF" opacity={0.75} stroke={c.edge} strokeWidth={1} />
      <SvgText x={30} y={20.5} fontSize={12} fontWeight="bold" fill={c.ink} textAnchor="middle">
        {symbol}
      </SvgText>
      <Circle cx={12} cy={16} r={2} fill={c.edge} opacity={0.5} />
      <Circle cx={48} cy={16} r={2} fill={c.edge} opacity={0.5} />
    </Svg>
  );
}

function DropItemView({ item }: { item: DropItem }) {
  if (item.kind === 'bar') return <Bar palette={item.palette} />;
  if (item.kind === 'bracelet') return <Bracelet />;
  if (item.kind === 'note') return <Banknote currency={item.currency} symbol={item.symbol} />;
  return <Coin />;
}

function ArrowUp({ color }: { color: string }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Check({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Kasaya ekleme sonrası: kasa kapısı açılır, eklenen varlığa göre sikke, külçe, bilezik ya da banknot yukarıdan içeri düşer
 * (düştüğü an ses ve titreşim), kapı kapanır ve onay gelir. Çıkarmada (`withdraw`) kapı açılır, nesne
 * kasadan yükselip kaybolur, kapı kapanır. Hareket azaltma açıksa yalnızca sonuç rozeti gösterilir.
 */
export function VaultDropAnimation({ title, subtitle, assetId, mode = 'deposit', onDone }: Props) {
  const withdraw = mode === 'withdraw';
  const styles = useStyles();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const item = dropItemOf(assetId);
  const kind = item.kind;

  const backdrop = useSharedValue(0);
  const vaultScale = useSharedValue(reduceMotion ? 1 : 0.7);
  /** 1: kapalı, DOOR_OPEN_SCALE: açık. */
  const doorScale = useSharedValue(1);
  const coinY = useSharedValue(withdraw ? INSIDE_Y : START_Y);
  const coinSpin = useSharedValue(0);
  const coinOpacity = useSharedValue(reduceMotion ? 0 : 1);
  const doneScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  // Ebeveyn fiyat tikleriyle yeniden çizilir; animasyon yeniden başlamasın diye en güncel geri çağrı ref'te.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    backdrop.set(withTiming(1, { duration: 180 }));
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => onDoneRef.current();
    const openDoor = () =>
      doorScale.set(withDelay(DOOR_OPEN_DELAY_MS, withTiming(DOOR_OPEN_SCALE, { duration: DOOR_OPEN_MS, easing: Easing.out(Easing.cubic) })));
    const closeDoor = (delay: number) =>
      doorScale.set(withDelay(delay, withTiming(1, { duration: DOOR_CLOSE_MS, easing: Easing.in(Easing.cubic) })));

    if (reduceMotion) {
      doneScale.set(withTiming(1, { duration: 200 }));
      textOpacity.set(withTiming(1, { duration: 200 }));
      if (withdraw) feedbackDatasource.impact();
      else feedbackDatasource.success();
      timers.push(setTimeout(finish, REDUCED_HOLD_MS));
      return () => timers.forEach(clearTimeout);
    }

    vaultScale.set(withSpring(1, { damping: 12, stiffness: 180 }));
    openDoor();

    if (withdraw) {
      coinY.set(withDelay(RISE_DELAY_MS, withTiming(OUT_Y, { duration: RISE_MS, easing: Easing.out(Easing.cubic) })));
      coinSpin.set(withDelay(RISE_DELAY_MS, withTiming(360, { duration: RISE_MS, easing: Easing.linear })));
      coinOpacity.set(withDelay(RISEN_AT_MS - 220, withTiming(0, { duration: 260 })));
      closeDoor(WITHDRAW_CLOSE_DELAY_MS);
      doneScale.set(withDelay(WITHDRAW_CLOSED_AT_MS, withSpring(1, { damping: 11, stiffness: 200 })));
      textOpacity.set(withDelay(WITHDRAW_CLOSED_AT_MS + 40, withTiming(1, { duration: 220 })));
      timers.push(
        setTimeout(() => {
          if (kind !== 'note') feedbackDatasource.playCoinDrop();
          feedbackDatasource.impact();
        }, RISE_DELAY_MS),
        setTimeout(() => feedbackDatasource.impact(), WITHDRAW_CLOSED_AT_MS),
        setTimeout(finish, WITHDRAW_CLOSED_AT_MS + HOLD_AFTER_DONE_MS),
      );
      return () => timers.forEach(clearTimeout);
    }

    // Yerçekimi hissi: yavaş başlayıp hızlanır; açık kapıdan kasanın içine iner ve orada kalır.
    coinY.set(withDelay(DROP_DELAY_MS, withTiming(INSIDE_Y, { duration: DROP_MS, easing: Easing.in(Easing.quad) })));
    coinSpin.set(withDelay(DROP_DELAY_MS, withTiming(540, { duration: DROP_MS, easing: Easing.linear })));
    closeDoor(CLOSE_DELAY_MS);
    // Kapı kapanınca kasa hafifçe çöker ve toparlanır.
    vaultScale.set(
      withDelay(
        CLOSED_AT_MS,
        withSequence(withTiming(0.95, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 260 })),
      ),
    );
    doneScale.set(withDelay(CLOSED_AT_MS + 120, withSpring(1, { damping: 11, stiffness: 200 })));
    textOpacity.set(withDelay(CLOSED_AT_MS + 160, withTiming(1, { duration: 220 })));

    timers.push(
      setTimeout(() => {
        // Banknot sessiz düşer; metal nesnelerde sikke sesi.
        if (kind !== 'note') feedbackDatasource.playCoinDrop();
        feedbackDatasource.impact();
      }, LANDED_AT_MS),
      setTimeout(() => feedbackDatasource.impact(), CLOSED_AT_MS),
      setTimeout(() => feedbackDatasource.success(), CLOSED_AT_MS + 200),
      setTimeout(finish, CLOSED_AT_MS + HOLD_AFTER_DONE_MS),
    );
    return () => timers.forEach(clearTimeout);
    // Animasyon bir kez, açılışta oynar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));
  const vaultStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vaultScale.get() }],
  }));
  // Menteşe sol kenarda: ölçek kapının merkezinden değil sol kenarından uygulanır.
  const doorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -DOOR.width / 2 }, { scaleX: doorScale.get() }, { translateX: DOOR.width / 2 }],
  }));
  const coinStyle = useAnimatedStyle(() => {
    const phase = (coinSpin.get() * Math.PI) / 180;
    if (kind === 'coin') {
      // Dönerken sikke daralıp genişler: madeni paranın kendi ekseninde dönmesi gibi.
      return {
        opacity: coinOpacity.get(),
        transform: [{ translateY: coinY.get() }, { scaleX: Math.abs(Math.cos(phase)) * 0.8 + 0.2 }],
      };
    }
    if (kind === 'note') {
      // Kâğıt para hafifçe sağa sola savrularak düşer.
      return {
        opacity: coinOpacity.get(),
        transform: [
          { translateY: coinY.get() },
          { translateX: Math.sin(phase * 0.66) * 12 },
          { rotate: `${Math.sin(phase * 0.66) * 16}deg` },
        ],
      };
    }
    // Külçe ve bilezik ağırdır: hafifçe sallanarak düşer.
    return {
      opacity: coinOpacity.get(),
      transform: [{ translateY: coinY.get() }, { rotate: `${Math.sin(phase * 0.5) * 14}deg` }],
    };
  });
  const doneStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneScale.get() }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.get() }));

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.panel, backdropStyle]}>
          <View style={styles.stage}>
            <Animated.View style={[styles.vault, vaultStyle]}>
              <Vault />
              {/* Nesne gövdenin önünde, kapının arkasında: kapı kapanınca içeride kalır. */}
              <Animated.View style={[styles.coin, coinStyle]}>
                <DropItemView item={item} />
              </Animated.View>
              <Animated.View style={[styles.door, doorStyle]}>
                <VaultDoor />
              </Animated.View>
            </Animated.View>
            <Animated.View
              style={[styles.done, { backgroundColor: withdraw ? colors.brand.gold : colors.semantic.up }, doneStyle]}
            >
              {withdraw ? <ArrowUp color="#FFFFFF" /> : <Check color="#FFFFFF" />}
            </Animated.View>
          </View>
          <Animated.View style={[styles.copy, textStyle]}>
            <AppText variant="h2">{title}</AppText>
            {subtitle ? (
              <AppText variant="body" tone="secondary" style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 10, 14, 0.78)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: {
    width: 290,
    alignItems: 'center',
    gap: paddings.lg,
    paddingTop: paddings.xl + 8,
    paddingBottom: paddings.xl,
    paddingHorizontal: paddings.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  stage: { width: VAULT, height: VAULT, alignItems: 'center' },
  vault: { width: VAULT, height: VAULT, alignItems: 'center' },
  coin: { position: 'absolute', top: 0, zIndex: 1 },
  door: { position: 'absolute', left: DOOR.left, top: DOOR.top, width: DOOR.width, height: DOOR.height, zIndex: 2 },
  done: {
    position: 'absolute',
    right: -6,
    bottom: 4,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  copy: { alignItems: 'center', gap: 4, paddingHorizontal: paddings.xl },
  subtitle: { textAlign: 'center' },
}));
