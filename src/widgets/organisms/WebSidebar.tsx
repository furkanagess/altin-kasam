import { STORE_LINKS } from '@/src/core/constants/stores';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { webLayout } from '@/src/core/theme/web';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { TabIcon, type TabIconName } from '@/src/widgets/atoms/TabIcon';
import { router, usePathname, type Href } from 'expo-router';
import React, { type ReactNode } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = {
  /** `medium` ekranda yalnızca ikonlar gösterilir. */
  collapsed: boolean;
};

/** Ana bölümler (sekmeler); sırası telefondaki alt sekme çubuğuyla aynı. */
const SECTIONS: readonly { href: Href; label: string; icon: TabIconName; paths: readonly string[] }[] = [
  { href: '/', label: 'Piyasa', icon: 'market', paths: ['/', '/index'] },
  { href: '/analytics', label: 'Analiz', icon: 'analysis', paths: ['/analytics'] },
  { href: '/community', label: 'Topluluk', icon: 'community', paths: ['/community'] },
  { href: '/portfolio', label: 'Kasam', icon: 'portfolio', paths: ['/portfolio'] },
];

type IconProps = { color: string };

function PlusIcon({ color }: IconProps) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function CalendarIcon({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} stroke={color} strokeWidth={1.8} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function BellIcon({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GearIcon({ color }: IconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      <Path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Geniş web ekranının sol gezinme çubuğu. Kök düzende yığının yanında çizilir; böylece detay
 * sayfalarında (altın türü, pozisyon, analiz…) da görünür kalır. Ana bölümler sekmelerdir,
 * alttaki kısayollar (takvim, alarm, ayarlar) yığına açılan ekranlardır.
 */
export function WebSidebar({ collapsed }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const pathname = usePathname();
  const { isPremium, openPaywall } = useSubscription();

  const item = (key: string, label: string, icon: (color: string) => ReactNode, active: boolean, onPress: () => void) => {
    const color = active ? colors.brand.goldDeep : colors.text.secondary;
    return (
      <Pressable
        key={key}
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={label}
        aria-current={active ? 'page' : undefined}
        style={[styles.item, collapsed && styles.itemCollapsed, active && styles.itemActive]}
      >
        {icon(color)}
        {collapsed ? null : (
          <AppText variant="bodyStrong" style={{ color: active ? colors.text.primary : colors.text.secondary }}>
            {label}
          </AppText>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { width: collapsed ? webLayout.sidebar.collapsed : webLayout.sidebar.expanded }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => router.navigate('/')}
          accessibilityRole="link"
          accessibilityLabel="Altın Kasam ana sayfa"
          style={[styles.brand, collapsed && styles.brandCollapsed]}
        >
          <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
          {collapsed ? null : <AppText variant="h3">Altın Kasam</AppText>}
        </Pressable>

        <Pressable
          onPress={() => router.push('/add-holding')}
          accessibilityRole="button"
          accessibilityLabel="Varlık ekle"
          style={[styles.add, collapsed && styles.addCollapsed]}
        >
          <PlusIcon color={colors.text.onGold} />
          {collapsed ? null : <AppText style={styles.addLabel}>Varlık ekle</AppText>}
        </Pressable>

        <View style={styles.group}>
          {SECTIONS.map((section) =>
            item(
              section.label,
              section.label,
              (color) => <TabIcon name={section.icon} color={color} focused={section.paths.includes(pathname)} size={22} />,
              section.paths.includes(pathname),
              () => router.navigate(section.href),
            ),
          )}
        </View>

        <View style={[styles.group, styles.divider]}>
          {item('calendar', 'Ekonomik takvim', (c) => <CalendarIcon color={c} />, pathname === '/calendar', () =>
            router.push('/calendar' as Href),
          )}
          {item('alarm', 'Fiyat alarmı', (c) => <BellIcon color={c} />, pathname === '/alarm', () =>
            router.push('/alarm' as Href),
          )}
          {item('settings', 'Ayarlar', (c) => <GearIcon color={c} />, pathname === '/settings', () =>
            router.push('/settings' as Href),
          )}
        </View>
      </ScrollView>

      {collapsed ? null : (
        <View style={styles.footer}>
          {isPremium ? null : (
            <Pressable onPress={() => openPaywall()} accessibilityRole="button" style={styles.pro}>
              <AppText variant="bodyStrong" tone="gold">
                Pro’ya geç
              </AppText>
              <AppText variant="caption" tone="secondary">
                Uzun dönem grafikler, takvim ve topluluk beklentisi
              </AppText>
            </Pressable>
          )}
          <AppText variant="caption" tone="tertiary">
            Alarmlar ve widget telefonda
          </AppText>
          <View style={styles.stores}>
            <Pressable
              onPress={() => void Linking.openURL(STORE_LINKS.ios)}
              accessibilityRole="link"
              style={styles.store}
            >
              <AppText variant="caption" style={styles.storeLabel}>
                App Store
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => void Linking.openURL(STORE_LINKS.android)}
              accessibilityRole="link"
              style={styles.store}
            >
              <AppText variant="caption" style={styles.storeLabel}>
                Google Play
              </AppText>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    height: '100%',
    backgroundColor: colors.surface.elevated,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border.subtle,
  },
  content: { gap: paddings.md, padding: paddings.sm },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingHorizontal: paddings.xs,
    paddingVertical: paddings.xs,
    borderRadius: radii.md,
  },
  brandCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: paddings.xs,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.brand.gold,
  },
  addCollapsed: { minHeight: 44, width: 44, alignSelf: 'center' },
  addLabel: { fontWeight: '700', color: colors.text.onGold },
  group: { gap: 2 },
  divider: {
    paddingTop: paddings.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    minHeight: 44,
    paddingHorizontal: paddings.sm,
    borderRadius: radii.md,
  },
  itemCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  itemActive: { backgroundColor: colors.surface.goldTint },
  footer: {
    gap: paddings.xs,
    padding: paddings.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  pro: {
    gap: 2,
    padding: paddings.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
  stores: { flexDirection: 'row', gap: paddings.xs },
  store: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  storeLabel: { fontWeight: '700', color: colors.text.primary },
}));
