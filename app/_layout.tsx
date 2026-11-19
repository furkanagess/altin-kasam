import { HeaderCloseButton } from '@/src/widgets/atoms/HeaderCloseButton';
import { HeaderSupportButton } from '@/src/widgets/atoms/HeaderSupportButton';
import { AppProviders } from '@/src/providers/AppProviders';
import { ThemeProvider, useTheme } from '@/src/core/theme';
import { AddHoldingFab } from '@/src/widgets/organisms/AddHoldingFab';
import { TourOverlay } from '@/src/widgets/organisms/TourOverlay';
import { TourProvider } from '@/src/viewmodels/tour/TourProvider';
import { NetworkBanner } from '@/src/widgets/organisms/NetworkBanner';
import { DialogHost } from '@/src/widgets/organisms/DialogHost';
import { WebModalFrame } from '@/src/widgets/organisms/WebModalFrame';
import { useBreakpoint } from '@/src/core/theme/web';
import { notificationsDatasource } from '@/src/data/datasources/notificationsDatasource';
import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  type Href,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

/** Geniş web ekranında ortalanmış pencere olarak açılan modal rotalar ve pencere genişliği. */
const WEB_MODALS: Record<string, 'sm' | 'lg'> = {
  goal: 'sm',
  alarm: 'sm',
  'add-holding/index': 'lg',
};

/** Navigasyon (başlıklar, kart zeminleri) ve durum çubuğu seçili temayı izler. */
function RootNavigator() {
  const { colors, scheme } = useTheme();
  const wideWeb = useBreakpoint() !== 'compact';
  /**
   * Modal rotaların seçenekleri. Geniş web'de rota saydam katman olarak açılır ve kendi başlığını
   * `WebModalFrame` çizer; telefonda ve native'de bugünkü modal sunum korunur.
   */
  const modal = (title: string, closeButton = true) =>
    wideWeb
      ? ({
          title,
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'none',
          contentStyle: { backgroundColor: 'transparent' },
        } as const)
      : ({ title, presentation: 'modal', ...(closeButton ? { headerRight: () => <HeaderCloseButton /> } : null) } as const);
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand.gold,
        background: colors.surface.canvas,
        card: colors.surface.canvas,
        text: colors.text.primary,
        border: colors.border.subtle,
      },
    };
  }, [colors, scheme]);

  // Fiyat alarmı ve takip edilen kaynak bildirimleri ilgili ekranı açar.
  useEffect(() => notificationsDatasource.onOpen((path) => router.push(path as Href)), []);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <TourProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenLayout={({ children, route, options }) => {
          const size = wideWeb ? WEB_MODALS[route.name] : undefined;
          return size ? (
            <WebModalFrame title={typeof options.title === 'string' ? options.title : undefined} size={size}>
              {children}
            </WebModalFrame>
          ) : (
            children
          );
        }}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface.canvas },
          headerTintColor: colors.brand.ink,
          headerTitleStyle: { fontWeight: '600' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.surface.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="goal"
          options={modal('Yatırım hedefi', false)}
        />
        <Stack.Screen
          name="insight"
          options={{ title: 'Topluluk beklentisi', presentation: 'card' }}
        />
        <Stack.Screen
          name="settings"
          options={{ title: 'Ayarlar', presentation: 'card', headerRight: () => <HeaderSupportButton /> }}
        />
        <Stack.Screen
          name="widget"
          options={{ title: 'Ana ekran widget’ı', presentation: 'card' }}
        />
        <Stack.Screen
          name="premium-benefits"
          options={{ title: 'Pro avantajların', presentation: 'card' }}
        />
        <Stack.Screen
          name="paywall"
          options={{ title: 'Pro', presentation: 'fullScreenModal', headerShown: false }}
        />
        <Stack.Screen
          name="add-holding/index"
          options={modal('Varlık ekle')}
        />
        <Stack.Screen
          name="alarm"
          options={modal('Fiyat alarmı')}
        />
        <Stack.Screen
          name="gold/[id]"
          options={{ title: '', presentation: 'card' }}
        />
        <Stack.Screen name="metal/[symbol]" options={{ title: '', presentation: 'card' }} />
        <Stack.Screen
          name="analysis/[id]"
          options={{ title: 'Haftalık analiz', presentation: 'card' }}
        />
        <Stack.Screen
          name="economic-event/[id]"
          options={{ title: 'Karar raporu', presentation: 'card' }}
        />
        <Stack.Screen
          name="calendar"
          options={{ title: 'Ekonomik takvim', presentation: 'card' }}
        />
        <Stack.Screen
          name="holding/[id]"
          options={{ title: 'Varlık detayı', presentation: 'card' }}
        />
        <Stack.Screen
          name="position/[assetId]"
          options={{ title: '', presentation: 'card' }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{ title: '', presentation: 'card' }}
        />
        <Stack.Screen
          name="sources"
          options={{ title: 'Haber kaynakları', presentation: 'card' }}
        />
        <Stack.Screen name="data-sources" options={{ title: 'Veri kaynakları', presentation: 'card' }} />
        <Stack.Screen name="support" options={{ title: 'Destek', presentation: 'card' }} />
        <Stack.Screen
          name="share-vault"
          options={{ title: 'Kasamı paylaş', presentation: 'card' }}
        />
        <Stack.Screen
          name="reader"
          options={{ title: '', presentation: 'card' }}
        />
      </Stack>
      <AddHoldingFab />
      <NetworkBanner />
      <TourOverlay />
      <DialogHost />
      </TourProvider>
    </NavigationThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
