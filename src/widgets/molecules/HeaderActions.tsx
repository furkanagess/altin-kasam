import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { TourTarget } from '@/src/widgets/atoms/TourTarget';
import { AppText } from '@/src/widgets/atoms/AppText';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

function CrownIcon({ color, filled }: { color: string; filled: boolean }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path
        d="M3 17 4.5 7l5 4.5L12 5l2.5 6.5 5-4.5L21 17Z"
        fill={filled ? color : 'none'}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M4 20.5h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function GearIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

/** Sekme ekranlarının üst çubuğunun sağı: Pro ve ayarlar. */
export function HeaderActions() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { isPremium, openPaywall } = useSubscription();
  return (
    <View style={styles.row}>
      <TourTarget id="header-pro">
      {isPremium ? (
        // Pro üye: satın alma butonu yerine üyeliğin aktif olduğunu söyleyen durum alanı; dokununca avantajlar açılır.
        <Pressable
          onPress={() => router.push('/premium-benefits')}
          style={styles.status}
          accessibilityRole="button"
          accessibilityLabel="Pro üyelik aktif, avantajlarını gör"
          hitSlop={6}
        >
          <CrownIcon color={colors.brand.goldDeep} filled />
          <View>
            <AppText variant="caption" style={[styles.statusTitle, { color: colors.brand.goldDeep }]}>
              Pro üyelik
            </AppText>
            <AppText variant="caption" style={[styles.statusSub, { color: colors.text.secondary }]}>
              Aktif
            </AppText>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => openPaywall()}
          style={styles.premium}
          accessibilityRole="button"
          accessibilityLabel="Pro’ya geç"
          hitSlop={6}
        >
          <CrownIcon color={colors.brand.goldDeep} filled={false} />
          <AppText variant="caption" style={[styles.premiumText, { color: colors.brand.goldDeep }]}>
            Pro
          </AppText>
        </Pressable>
      )}
      </TourTarget>
      <TourTarget id="header-settings">
      <Pressable
        onPress={() => router.push('/settings')}
        style={styles.settings}
        accessibilityRole="button"
        accessibilityLabel="Ayarlar"
        hitSlop={8}
      >
        <GearIcon color={colors.brand.ink} />
      </Pressable>
      </TourTarget>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  premium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: paddings.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.gold,
    backgroundColor: colors.surface.goldTint,
  },
  // Durum alanı: buton gibi dolu/çerçeveli değil; yalnızca ikon ve iki satır metin.
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: paddings.xs },
  statusTitle: { fontWeight: '700', lineHeight: 14 },
  statusSub: { fontSize: 11, lineHeight: 13 },
  premiumText: { fontWeight: '700' },
  settings: { padding: 6, borderRadius: radii.pill },
}));
