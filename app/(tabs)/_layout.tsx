import { useTheme } from '@/src/core/theme';
import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { TabIcon } from '@/src/widgets/atoms/TabIcon';
import { TourTarget } from '@/src/widgets/atoms/TourTarget';
import { HeaderActions } from '@/src/widgets/molecules/HeaderActions';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
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

  // Depo okunana kadar sekmeler çizilmez; aksi halde karşılama ekranından önce bir an görünür.
  if (!loaded) return null;
  if (!onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs
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
          tabBarIcon: ({ color, focused }) => (
            <TourTarget id="tab-analytics">
              <TabIcon name="analysis" color={color} focused={focused} />
            </TourTarget>
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Topluluk',
          tabBarLabel: ({ focused }) => <TabLabel title="Topluluk" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <TourTarget id="tab-community">
              <TabIcon name="community" color={color} focused={focused} />
            </TourTarget>
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Kasam',
          tabBarLabel: ({ focused }) => <TabLabel title="Kasam" focused={focused} />,
          tabBarIcon: ({ color, focused }) => (
            <TourTarget id="tab-portfolio">
              <TabIcon name="portfolio" color={color} focused={focused} />
            </TourTarget>
          ),
        }}
      />
    </Tabs>
  );
}
