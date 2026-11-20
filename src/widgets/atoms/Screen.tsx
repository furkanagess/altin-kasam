import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { useBreakpoint, webLayout } from '@/src/core/theme/web';
import { HeaderShownContext } from 'expo-router/react-navigation';
import { registerTourScroller } from '@/src/viewmodels/tour/tourTargets';
import React, { useContext, useEffect, useRef, type ComponentRef } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Ekranın altına sabitlenen ana işlem (ör. "Alarm kur"); içerik kaydırılsa da yerinde kalır,
   * içerikle arasında boşluk bırakılır.
   */
  footer?: React.ReactNode;
  /**
   * Alt güvenli alan footer'a eklenir. Sekme ekranlarında `false`: alt boşluğu sekme çubuğu bırakır.
   */
  footerSafeArea?: boolean;
  /** Uygulama turu bu ekranı kaydırabilsin diye verilen kimlik. */
  scrollId?: string;
  /**
   * Geniş web ekranında içeriğin en fazla genişliği: `content` (varsayılan, 1200), metin ve formlar
   * için `readable` (720) ya da sınırsız `full` (ör. Piyasa: grafik menüye bitişik, sağda reklam
   * sütunu). Telefonda ve native'de etkisizdir.
   */
  webWidth?: 'content' | 'readable' | 'full';
};

export function Screen({
  children,
  scroll,
  onRefresh,
  refreshing,
  style,
  contentStyle,
  footer,
  footerSafeArea = true,
  scrollId,
  webWidth = 'content',
}: Props) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const offsetRef = useRef(0);
  useEffect(() => {
    if (!scrollId) return;
    return registerTourScroller(scrollId, {
      scrollTo: (y, animated) => scrollRef.current?.scrollTo({ y, animated }),
      offset: () => offsetRef.current,
    });
  }, [scrollId]);
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Geniş ekranda içerik ortalanır; kenar boşluğu (`paddings.screen`) korunur, böylece ona negatif
  // margin ile taşan bileşenler (ör. grafik sayfaları) bozulmaz.
  const wide = useBreakpoint() !== 'compact' && webWidth !== 'full';
  const maxWidth = webWidth === 'readable' ? webLayout.readable : webLayout.maxContent;
  const centered: StyleProp<ViewStyle> = wide
    ? { width: '100%', maxWidth: maxWidth + paddings.screen * 2, alignSelf: 'center' }
    : null;
  // Footer kendi kenar boşluğunu taşır; iç genişliği içerikle hizalanır.
  const centeredFooter: StyleProp<ViewStyle> = wide ? { width: '100%', maxWidth, alignSelf: 'center' } : null;
  // Başlık çubuğu varsa üst güvenli alanı o zaten bırakır; ikinci kez eklenmez.
  const headerShown = useContext(HeaderShownContext);
  const edges = headerShown ? (['left', 'right'] as const) : (['top', 'left', 'right'] as const);

  const footerView = footer ? (
    <View
      style={[
        styles.footer,
        { paddingBottom: footerSafeArea ? Math.max(insets.bottom, paddings.sm) : paddings.sm },
      ]}
    >
      <View style={[styles.footerInner, centeredFooter]}>{footer}</View>
    </View>
  ) : null;

  if (scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        <ScrollView
          ref={scrollRef}
          scrollEventThrottle={scrollId ? 16 : undefined}
          onScroll={scrollId ? (e) => { offsetRef.current = e.nativeEvent.contentOffset.y; } : undefined}
          style={styles.flex}
          contentContainerStyle={[styles.content, centered, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand.gold} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
        {footerView}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={[styles.content, footer ? styles.flex : null, centered, contentStyle]}>{children}</View>
      {footerView}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  safe: {
    flex: 1,
    backgroundColor: colors.surface.canvas,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: paddings.screen,
    paddingTop: paddings.sm,
    paddingBottom: paddings.xl,
    gap: 16,
  },
  footerInner: { gap: paddings.xs },
  footer: {
    paddingHorizontal: paddings.screen,
    paddingTop: paddings.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.canvas,
  },
}));
