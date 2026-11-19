import { makeStyles, useTheme } from '@/src/core/theme';
import { useBreakpoint } from '@/src/core/theme/web';
import { storageGet, storageSet } from '@/src/core/storage/storage';
import { registerTourTarget } from '@/src/viewmodels/tour/tourTargets';
import { router, usePathname } from 'expo-router';
import React, { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, PanResponder, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path } from 'react-native-svg';

const SIZE = 56;
const MARGIN = 16;
const POSITION_KEY = 'altin_kasam_fab_position_v1';
/** Bu mesafeden az hareket dokunma sayılır, fazlası sürükleme. */
const TAP_SLOP = 6;
/** Tam ekran akışlarda ya da zaten varlık eklerken buton görünmez. */
const HIDDEN_ON = ['/add-holding', '/onboarding', '/paywall', '/goal', '/alarm', '/share-vault', '/reader', '/widget', '/manage-subscription'];
/** Sekme çubuğunun üstünde kalması için varsayılan alt boşluk. */
const DEFAULT_BOTTOM_OFFSET = 96;

type Point = { x: number; y: number };
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Sürükleme sırasında render'dan bağımsız değişen değerler. */
class DragStore {
  readonly pan = new Animated.ValueXY({ x: 0, y: 0 });
  position: Point = { x: 0, y: 0 };
  bounds: Bounds = { minX: MARGIN, maxX: 0, minY: 0, maxY: 0 };
  setBounds(bounds: Bounds) {
    this.bounds = bounds;
  }
  setPosition(position: Point) {
    this.position = position;
  }
}

/** Uygulamanın her yerinde gezdirilebilen "Varlık ekle" butonu; son konumu hatırlar. */
export function AddHoldingFab() {
  const styles = useStyles();
  const { colors } = useTheme();
  const pathname = usePathname();
  // Geniş web ekranında "Varlık ekle" kenar çubuğunda ve başlıkta durur; yüzen buton içeriği örtmez.
  const wide = useBreakpoint() !== 'compact';
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [drag] = useState(() => new DragStore());
  const { pan } = drag;
  const fabRef = useRef<ComponentRef<typeof Animated.View>>(null);
  useEffect(() => registerTourTarget('fab', fabRef), []);

  useEffect(() => {
    drag.setBounds({
      minX: MARGIN,
      maxX: width - SIZE - MARGIN,
      minY: insets.top + MARGIN,
      maxY: height - SIZE - insets.bottom - MARGIN,
    });
  }, [drag, width, height, insets.top, insets.bottom]);

  useEffect(() => {
    const id = pan.addListener((v) => {
      drag.setPosition(v);
    });
    return () => pan.removeListener(id);
  }, [drag, pan]);

  // Kayıtlı konumu yükle (ekrana sığacak şekilde kırp); yoksa sağ alt.
  useEffect(() => {
    let alive = true;
    const minX = MARGIN;
    const maxX = width - SIZE - MARGIN;
    const minY = insets.top + MARGIN;
    const maxY = height - SIZE - insets.bottom - MARGIN;
    const clamp = (p: Point): Point => ({
      x: Math.min(Math.max(p.x, minX), maxX),
      y: Math.min(Math.max(p.y, minY), maxY),
    });
    storageGet<Point>(POSITION_KEY)
      .catch(() => null)
      .then((saved) => {
        if (!alive) return;
        const start = clamp(saved ?? { x: maxX, y: maxY - DEFAULT_BOTTOM_OFFSET + MARGIN });
        pan.setValue(start);
        setReady(true);
      });
    return () => {
      alive = false;
    };
    // Yalnızca ilk açılışta; sonraki sınırlar sürükleme bırakılırken uygulanır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderGrant: () => {
        pan.setOffset({ x: drag.position.x, y: drag.position.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) {
          router.push('/add-holding');
          return;
        }
        // En yakın yatay kenara yapış, dikeyde ekran sınırında kal.
        const { minX, maxX, minY, maxY } = drag.bounds;
        const target: Point = {
          x: drag.position.x < (minX + maxX) / 2 ? minX : maxX,
          y: Math.min(Math.max(drag.position.y, minY), maxY),
        };
        Animated.spring(pan, { toValue: target, useNativeDriver: false, bounciness: 6 }).start();
        void storageSet(POSITION_KEY, target).catch(() => {});
      },
      onPanResponderTerminate: () => pan.flattenOffset(),
    }),
  );

  if (wide || !ready || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <Animated.View
      ref={fabRef}
      collapsable={false}
      {...responder.panHandlers}
      style={[styles.fab, { transform: pan.getTranslateTransform() }]}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Varlık ekle"
      accessibilityHint="Dokunarak varlık ekle, basılı tutup sürükleyerek yerini değiştir"
    >
      {/* Altın külçesi; ortasındaki artı "kasaya ekle" anlamı verir. Şekil viewBox'ta aşağıda kaldığı için ortalamak üzere yukarı alınır. */}
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <G transform="translate(0 -1.67)">
          <Path
            d="M3.5 18.5 6.2 8.8a1 1 0 0 1 .96-.73h9.68a1 1 0 0 1 .96.73l2.7 9.7a.6.6 0 0 1-.58.76H4.08a.6.6 0 0 1-.58-.76Z"
            stroke={colors.surface.canvas}
            strokeWidth={1.7}
            strokeLinejoin="round"
          />
          <Path d="M12 11.2v5M9.5 13.7h5" stroke={colors.surface.canvas} strokeWidth={1.9} strokeLinecap="round" />
        </G>
      </Svg>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  fab: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.gold,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
}));
