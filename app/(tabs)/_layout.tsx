import { useTheme } from '@/src/core/theme';
import { useBreakpoint } from '@/src/core/theme/web';
import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { TabIcon } from '@/src/widgets/atoms/TabIcon';
import { HeaderActions } from '@/src/widgets/molecules/HeaderActions';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, View } from 'react-native';
import { PriceTimestamp } from '@/src/widgets/molecules/PriceTimestamp';

function TabLabel({ title, focused }: { title: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: focused ? '700' : '500',
        color: focused ? colors.brand.goldDeep : colors.text.tertiary,
      }}
    >
      {title}
    </Text>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { loaded, onboardingDone } = useGoal();
  // Geniş web ekranında alt sekme çubuğu gizlenir; yerine kök düzendeki sol menü kullanılır.
  const sidebar = useBreakpoint() !== 'compact';

  // Depo okunana kadar sekmeler çizilmez; aksi halde karşılama ekranından önce bir an görünür.
  if (!loaded) return null;
  // Telefonda karşılama zorunlu. Web'de isteğe bağlı: arama motorundan ya da paylaşılan bir linkten
  // gelen ziyaretçi doğrudan istediği sayfaya düşer.
  if (!onboardingDone && Platform.OS !== 'web') return <Redirect href="/onboarding" />;

  return (
    <Tabs
      // Geniş web ekranında sekme çubuğu yok: kalıcı sol menü kök düzende çizilir (`app/_layout.tsx`).
      tabBar={sidebar ? () => null : undefined}
      screenOptions={{
        headerShown: true,
        headerTitleAlign: 'left',
        headerStyle: { backgroundColor: colors.surface.canvas },
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 22, fontWeight: '800', color: colors.brand.ink },
        headerRight: () => <HeaderActions />,
        headerRightContainerStyle: { paddingRight: 12 },
        headerLeftContainerStyle: { paddingLeft: 8 },
        tabBarStyle: {
          backgroundColor: colors.surface.elevated,
          borderTopColor: colors.border.subtle,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.brand.goldDeep,
        tabBarInactiveTintColor: colors.text.tertiary,
      }}
    >
      {/* `index` uygulamanın açılış ekranıdır: Piyasa. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Piyasa',
          headerTitle: ({ children }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.brand.ink }}>{children}</Text>
              <PriceTimestamp />
            </View>
          ),
          tabBarLabel: ({ focused }) => <TabLabel title="Piyasa" focused={focused} />,
          tabBarIcon: ({ color, focused }) => <TabIcon name="market" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analiz',
          tabBarLabel: ({ focused }) => <TabLabel title="Analiz" focused={focused} />,
          tabBarIcon: ({ color, focused }) => <TabIcon name="analysis" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Topluluk',
          tabBarLabel: ({ focused }) => <TabLabel title="Topluluk" focused={focused} />,
          tabBarIcon: ({ color, focused }) => <TabIcon name="community" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Kasam',
          tabBarLabel: ({ focused }) => <TabLabel title="Kasam" focused={focused} />,
          tabBarIcon: ({ color, focused }) => <TabIcon name="portfolio" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
