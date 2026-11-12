import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props<T extends string> = {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  style?: StyleProp<ViewStyle>;
};

/** Ekranın üstünde, alt çizgili sekme çubuğu. */
export function TopTabs<T extends string>({ tabs, value, onChange, style }: Props<T>) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, style]} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={styles.tab}
            accessibilityRole="tab"
            aria-selected={active}
          >
            <AppText
              variant="bodyStrong"
              style={{ color: active ? colors.brand.goldDeep : colors.text.tertiary }}
            >
              {tab.label}
            </AppText>
            <View style={[styles.indicator, active && styles.indicatorActive]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.surface.canvas,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: paddings.sm, gap: paddings.xs },
  indicator: { alignSelf: 'stretch', height: 3, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.brand.gold },
}));
