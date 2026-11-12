import { makeStyles, radii, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  /** Seçili filtre sayısı; 0 ise rozet gösterilmez. */
  activeCount: number;
  onPress: () => void;
};

export function FilterButton({ activeCount, onPress }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const active = activeCount > 0;
  const color = active ? colors.brand.goldDeep : colors.text.secondary;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, active && styles.active]}
      accessibilityRole="button"
      accessibilityLabel={active ? `Filtrele, ${activeCount} filtre seçili` : 'Filtrele'}
      hitSlop={6}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path
          d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5Z"
          fill={active ? color : 'none'}
          fillOpacity={0.2}
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      <AppText variant="caption" style={{ color, fontWeight: '700' }}>
        Filtrele
      </AppText>
      {active ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{activeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
  },
  active: {
    borderColor: colors.brand.gold,
    backgroundColor: colors.surface.goldTint,
  },
  count: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.gold,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text.onGold,
  },
}));
