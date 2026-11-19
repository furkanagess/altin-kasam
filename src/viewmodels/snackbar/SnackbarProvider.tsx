import { useBreakpoint } from '@/src/core/theme/web';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Mesaj ekranda bu kadar kalıp kendiliğinden kapanır. */
const DEFAULT_DURATION_MS = 3000;
const FADE_MS = 200;
/** Durum çubuğunun / başlığın altında kalması için üstten boşluk. */
const TOP_OFFSET = 8;
/** Mesaj bu kadar yukarıdan aşağı kayarak girer. */
const SLIDE_DISTANCE = 28;

type Snack = { id: number; message: string; durationMs: number };

type SnackbarContextValue = {
  /** Kısa onay mesajı gösterir; yenisi gelirse öncekinin yerini alır. */
  showSnackbar: (message: string, durationMs?: number) => void;
};

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

/**
 * Uygulama genelinde tek snackbar. Kök sağlayıcıda durduğu için mesajı gösteren ekran kapansa bile
 * (ör. alarm kurulunca geri dönülür) mesaj bir önceki ekranın üstünde kalır.
 */
export function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [snack, setSnack] = useState<Snack | null>(null);
  const counter = useRef(0);

  const showSnackbar = useCallback((message: string, durationMs = DEFAULT_DURATION_MS) => {
    counter.current += 1;
    setSnack({ id: counter.current, message, durationMs });
  }, []);

  const dismiss = useCallback((id: number) => {
    // Daha yeni bir mesaj gelmişse ona dokunulmaz.
    setSnack((current) => (current?.id === id ? null : current));
  }, []);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snack ? <SnackbarView key={snack.id} snack={snack} onDone={dismiss} /> : null}
    </SnackbarContext.Provider>
  );
}

function SnackbarView({ snack, onDone }: { snack: Snack; onDone: (id: number) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Geniş web ekranında sağ altta küçük bir bildirim olur; kenar çubuğu ve başlığın üstüne binmez.
  const wide = useBreakpoint() !== 'compact';
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Görünür, bekler, söner; sönünce kaldırılır.
    const animation = Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: FADE_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(Math.max(0, snack.durationMs - FADE_MS * 2)),
      Animated.timing(progress, { toValue: 0, duration: FADE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => {
      if (finished) onDone(snack.id);
    });
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(snack.message);
    return () => animation.stop();
  }, [progress, snack, onDone]);

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View
        style={[
          styles.bar,
          wide ? WIDE_POSITION : { top: insets.top + TOP_OFFSET },
          {
            opacity: progress,
            // Üstten aşağı iner (geniş ekranda alttan çıkar); kapanırken aynı yoldan geri gider.
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [wide ? SLIDE_DISTANCE : -SLIDE_DISTANCE, 0],
                }),
              },
            ],
          },
        ]}
        role="status"
        accessibilityLiveRegion="polite"
      >
        <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={colors.semantic.up} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <AppText variant="bodyStrong" style={styles.text}>
          {snack.message}
        </AppText>
      </Animated.View>
    </View>
  );
}

const WIDE_POSITION = { bottom: paddings.xl, right: paddings.xl, left: undefined, width: 380 } as const;

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar, SnackbarProvider içinde kullanılmalı');
  return ctx;
}

const useStyles = makeStyles((colors) => ({
  host: { ...StyleSheet.absoluteFill },
  // Uygulamanın düz dili: açık zemin, ince çizgi, altın vurgu; koyu ya da gölgeli kutu yok.
  bar: {
    position: 'absolute',
    left: paddings.md,
    right: paddings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingHorizontal: paddings.md,
    paddingVertical: paddings.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // GoalCard'daki onay halkasıyla aynı dil: dolu daire yerine ince çizgili halka.
  mark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.semantic.up,
  },
  text: { flex: 1 },
}));
