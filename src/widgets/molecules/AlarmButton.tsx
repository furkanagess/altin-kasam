import { makeStyles, radii, useTheme } from '@/src/core/theme';
import { BellIcon } from '@/src/widgets/atoms/BellIcon';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAlarms } from '@/src/viewmodels/alarm/AlarmProvider';

/**
 * Grafik başlığındaki fiyat alarmı düğmesi. `assetId` verilirse, o varlık için tetiklenmiş ve henüz
 * görülmemiş alarm sayısı ikonun üstünde rozet olarak gösterilir (1, 2, 3…, 9'dan fazlası 9+).
 */
export function AlarmButton({
  onPress,
  accessibilityLabel,
  assetId,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  assetId?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { unseenCount } = useAlarms();
  const unseen = assetId ? unseenCount(assetId) : 0;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={unseen ? `${accessibilityLabel}, ${unseen} yeni tetiklenen alarm` : accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <BellIcon color={colors.brand.goldDeep} size={16} />
      {unseen ? (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{unseen > 9 ? '9+' : unseen}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  button: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.semantic.down,
    borderWidth: 1.5,
    borderColor: colors.surface.canvas,
  },
  badgeText: { color: '#FFFFFF', fontSize: 9, lineHeight: 11, fontWeight: '800' },
}));
