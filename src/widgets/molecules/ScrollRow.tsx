import { makeStyles, useTheme } from '@/src/core/theme';
import { useBreakpoint } from '@/src/core/theme/web';
import React, { useCallback, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Kenara bu kadar yaklaşınca o taraftaki ok gizlenir (ondalıklı kaydırma payı). */
const EDGE_EPSILON = 4;
/** Oka dokununca görünür genişliğin bu kadarı kaydırılır; bir kart göz önünde kalır. */
const PAGE_FRACTION = 0.75;

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Oklar kenardan bu kadar içeride durur (ör. sayfa kenar boşluğu). */
  arrowInset?: number;
  role?: 'radiogroup' | 'list';
  'aria-label'?: string;
};

type ScrollArrowProps = {
  side: 'left' | 'right';
  onPress: () => void;
  /** Kapsayıcının kenarından uzaklık; ok dikeyde ortalanır. */
  inset: number;
  label?: string;
};

/** Yatay kaydırılan içeriğin kenarında duran ok; kapsayıcı `position: relative` olmalıdır. */
export function ScrollArrow({ side, onPress, inset, label }: ScrollArrowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.arrow, side === 'left' ? { left: inset } : { right: inset }]}
      accessibilityRole="button"
      accessibilityLabel={label ?? (side === 'left' ? 'Sola kaydır' : 'Sağa kaydır')}
      hitSlop={8}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path
          d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          stroke={colors.brand.goldDeep}
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

/** Yatay kaydırılan satır; devamı olan tarafta ok gösterir, oka dokununca o yöne kayar. */
export function ScrollRow({ children, style, contentContainerStyle, arrowInset = 6, ...a11y }: Props) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const offset = useRef(0);
  const viewport = useRef(0);
  const content = useRef(0);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Saniyede onlarca kaydırma olayı gelir; yalnızca okların görünürlüğü değişince yeniden çizilir.
  const update = useCallback(() => {
    const left = offset.current > EDGE_EPSILON;
    const right = offset.current + viewport.current < content.current - EDGE_EPSILON;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  // Geniş web ekranında fareyle yatay kaydırma zahmetli: öğeler satıra sarılan ızgara olur.
  const wide = useBreakpoint() !== 'compact';
  if (wide) {
    return (
      <View style={style}>
        <View style={[contentContainerStyle, { flexDirection: 'row', flexWrap: 'wrap' }]} {...a11y}>
          {children}
        </View>
      </View>
    );
  }

  const scrollBy = (direction: -1 | 1) => {
    const max = Math.max(0, content.current - viewport.current);
    const x = Math.min(max, Math.max(0, offset.current + direction * viewport.current * PAGE_FRACTION));
    ref.current?.scrollTo({ x, animated: true });
  };

  return (
    <View style={style}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        contentContainerStyle={contentContainerStyle}
        onLayout={(e: LayoutChangeEvent) => {
          viewport.current = e.nativeEvent.layout.width;
          update();
        }}
        onContentSizeChange={(width) => {
          content.current = width;
          update();
        }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = e.nativeEvent.contentOffset.x;
          update();
        }}
        {...a11y}
      >
        {children}
      </ScrollView>
      {edges.left ? <ScrollArrow side="left" inset={arrowInset} onPress={() => scrollBy(-1)} /> : null}
      {edges.right ? <ScrollArrow side="right" inset={arrowInset} onPress={() => scrollBy(1)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  arrow: {
    position: 'absolute',
    top: '50%',
    width: 30,
    height: 30,
    marginTop: -15,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
}));
