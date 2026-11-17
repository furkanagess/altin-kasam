import { makeStyles, paddings, useTheme } from '@/src/core/theme';
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
      {footer}
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
          contentContainerStyle={[styles.content, contentStyle]}
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
      <View style={[styles.content, footer ? styles.flex : null, contentStyle]}>{children}</View>
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
  footer: {
    gap: paddings.xs,
    paddingHorizontal: paddings.screen,
    paddingTop: paddings.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.canvas,
  },
}));
