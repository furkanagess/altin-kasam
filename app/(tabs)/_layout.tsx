import { colors } from '@/src/core/theme';
import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

function TabLabel({ title, focused }: { title: string; focused: boolean }) {
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Piyasa',
          tabBarLabel: ({ focused }) => <TabLabel title="Piyasa" focused={focused} />,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◈</Text>,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portföy',
          tabBarLabel: ({ focused }) => <TabLabel title="Portföy" focused={focused} />,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>▣</Text>,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Topluluk',
          tabBarLabel: ({ focused }) => <TabLabel title="Topluluk" focused={focused} />,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◉</Text>,
        }}
      />
    </Tabs>
  );
}
