import { AppProviders } from '@/src/providers/AppProviders';
import { colors } from '@/src/core/theme';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
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
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface.canvas },
          headerTintColor: colors.brand.ink,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.surface.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="asset/[symbol]"
          options={{ title: 'Varlık detayı', presentation: 'card' }}
        />
        <Stack.Screen
          name="add-holding/index"
          options={{ title: 'Altın ekle', presentation: 'modal' }}
        />
        <Stack.Screen
          name="holding/[id]"
          options={{ title: 'Holding', presentation: 'card' }}
        />
        <Stack.Screen
          name="post/[id]"
          options={{ title: 'Gönderi', presentation: 'card' }}
        />
      </Stack>
    </AppProviders>
  );
}
