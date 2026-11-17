import { networkMonitor, type ConnectionQuality } from '@/src/core/network/networkMonitor';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { formatClockTime } from '@/src/utils/format';
import { useNetworkStatus } from '@/src/viewmodels/network/useNetworkStatus';
import { AppText } from '@/src/widgets/atoms/AppText';
import { usePathname } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

/** Sekme ekranlarında uyarı sekme çubuğunun üstünde durur (`(tabs)/_layout` → `height: 64`). */
const TAB_PATHS = new Set(['/', '/analytics', '/community', '/portfolio']);
const TAB_BAR_HEIGHT = 64;
const BOTTOM_GAP = 10;
/** Tam ekran akışlarda (karşılama, ödeme) uyarı akışı bölmez; veri katmanı yine korunur. */
const HIDDEN_ON = ['/onboarding'];

const RECOVERED_MS = 2_500;
const WEAK_MS = 5_000;
/** Zayıf bağlantı uyarısı en fazla bu aralıkla bir kez gösterilir; kullanıcı bıktırılmaz. */
const WEAK_THROTTLE_MS = 3 * 60_000;
/** "Hâlâ bağlantı yok" geri bildirimi bu kadar görünür. */
const STILL_OFFLINE_MS = 2_000;

type Notice = 'offline' | 'offline-compact' | 'weak' | 'recovered' | null;

/**
 * Uygulama genelinde bağlantı uyarısı. Kök düzende bir kez durur:
 * - Çevrimdışı: kalıcı uyarı + "Tekrar dene"; kapatılınca küçük "Çevrimdışı" rozetine döner.
 * - Zayıf bağlantı: kısa süreli, seyrek tekrarlanan bilgi.
 * - Bağlantı geri geldi: kısa onay; veri sağlayıcıları aynı anda kendiliğinden yenilenir.
 */
export function NetworkBanner() {
  const { lastSuccessAt } = useNetworkStatus();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [initialQuality] = useState(() => networkMonitor.getStatus().quality);
  const [notice, setNotice] = useState<Notice>(() => (initialQuality === 'offline' ? 'offline' : null));
  const lastWeakShownAt = useRef(0);

  // Durum geçişlerini (durumun kendisini değil) uyarıya çevirir.
  useEffect(() => {
    let prev: ConnectionQuality = initialQuality;
    return networkMonitor.subscribe(() => {
      const quality = networkMonitor.getStatus().quality;
      if (quality === prev) return;
      const from = prev;
      prev = quality;
      if (quality === 'offline') {
        setNotice('offline');
        announce('İnternet bağlantısı kesildi');
      } else if (from === 'offline') {
        // Çevrimdışından zayıfa geçişte de önce "geri geldi" onayı daha anlamlı.
        setNotice('recovered');
        announce('Bağlantı geri geldi');
      } else if (quality === 'weak') {
        if (Date.now() - lastWeakShownAt.current > WEAK_THROTTLE_MS) {
          lastWeakShownAt.current = Date.now();
          setNotice('weak');
          announce('Bağlantı zayıf, veriler gecikebilir');
        }
      } else {
        // Zayıftan normale: sessizce kapanır.
        setNotice((n) => (n === 'weak' ? null : n));
      }
    });
  }, [initialQuality]);

  // Kısa süreli uyarılar kendiliğinden kapanır.
  useEffect(() => {
    if (notice !== 'weak' && notice !== 'recovered') return;
    const timer = setTimeout(() => setNotice(null), notice === 'weak' ? WEAK_MS : RECOVERED_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  if (!notice || HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const bottom = insets.bottom + (TAB_PATHS.has(pathname) ? TAB_BAR_HEIGHT : 0) + BOTTOM_GAP;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {notice === 'offline-compact' ? (
        <CompactOffline key="compact" bottom={bottom} onExpand={() => setNotice('offline')} />
      ) : (
        <NoticeCard
          key={notice}
          notice={notice}
          bottom={bottom}
          lastSuccessAt={lastSuccessAt}
          onCollapse={() => setNotice('offline-compact')}
          onClose={() => setNotice(null)}
        />
      )}
    </View>
  );
}

function announce(message: string) {
  if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(message);
}

function useEnterAnimation() {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return {
    opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
  };
}

type CardProps = {
  notice: Exclude<Notice, 'offline-compact' | null>;
  bottom: number;
  lastSuccessAt: number | null;
  onCollapse: () => void;
  onClose: () => void;
};

function NoticeCard({ notice, bottom, lastSuccessAt, onCollapse, onClose }: CardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const animated = useEnterAnimation();
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(false);

  useEffect(() => {
    if (!stillOffline) return;
    const timer = setTimeout(() => setStillOffline(false), STILL_OFFLINE_MS);
    return () => clearTimeout(timer);
  }, [stillOffline]);

  const retry = async () => {
    if (checking) return;
    setChecking(true);
    const online = await networkMonitor.retry();
    setChecking(false);
    if (!online) {
      setStillOffline(true);
      announce('Hâlâ bağlantı yok');
    }
  };

  const tone =
    notice === 'offline'
      ? { accent: colors.semantic.down, soft: colors.semantic.downSoft }
      : notice === 'weak'
        ? { accent: colors.semantic.warning, soft: colors.semantic.warningSoft }
        : { accent: colors.semantic.up, soft: colors.semantic.upSoft };

  const title =
    notice === 'offline' ? 'İnternet bağlantısı yok' : notice === 'weak' ? 'Bağlantı zayıf' : 'Bağlantı geri geldi';
  const message =
    notice === 'offline'
      ? stillOffline
        ? 'Hâlâ bağlantı yok. Wi-Fi ya da mobil veriyi kontrol et.'
        : lastSuccessAt
          ? `Son veriler ${formatClockTime(lastSuccessAt)} itibarıyla gösteriliyor.`
          : 'Bağlantı gelince veriler kendiliğinden yüklenecek.'
      : notice === 'weak'
        ? 'Fiyatlar ve haberler gecikmeli gelebilir.'
        : 'Veriler güncelleniyor.';

  return (
    <Animated.View
      style={[styles.card, { bottom, borderColor: tone.accent }, animated]}
      role={notice === 'offline' ? 'alert' : 'status'}
      accessibilityLiveRegion={notice === 'offline' ? 'assertive' : 'polite'}
    >
      <View style={[styles.iconWrap, { backgroundColor: tone.soft }]}>
        <NetworkIcon kind={notice} color={tone.accent} />
      </View>
      <View style={styles.texts}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" tone="secondary">
          {message}
        </AppText>
      </View>
      {notice === 'offline' ? (
        <>
          <Pressable
            onPress={() => void retry()}
            disabled={checking}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Bağlantıyı tekrar dene"
            accessibilityState={{ busy: checking }}
            hitSlop={6}
          >
            <AppText variant="bodyStrong" tone="gold">
              {checking ? 'Bakılıyor…' : 'Tekrar dene'}
            </AppText>
          </Pressable>
          <CloseButton onPress={onCollapse} label="Uyarıyı küçült" />
        </>
      ) : notice === 'weak' ? (
        <CloseButton onPress={onClose} label="Uyarıyı kapat" />
      ) : null}
    </Animated.View>
  );
}

function CompactOffline({ bottom, onExpand }: { bottom: number; onExpand: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const animated = useEnterAnimation();
  return (
    <Animated.View style={[styles.compact, { bottom }, animated]}>
      <Pressable
        onPress={onExpand}
        style={({ pressed }) => [styles.compactInner, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Çevrimdışı. Ayrıntılar için dokun"
        hitSlop={8}
      >
        <View style={[styles.dot, { backgroundColor: colors.semantic.down }]} />
        <AppText variant="caption" style={styles.compactText}>
          Çevrimdışı
        </AppText>
      </Pressable>
    </Animated.View>
  );
}

function CloseButton({ onPress, label }: { onPress: () => void; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
        <Path d="M6 6l12 12M18 6L6 18" stroke={colors.text.tertiary} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

function NetworkIcon({ kind, color }: { kind: CardProps['notice']; color: string }) {
  // Wi-Fi yayları; çevrimdışında üstü çizili, zayıfta yalnızca alt yaylar dolu.
  const faint = kind === 'weak' ? 0.3 : 1;
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 9a14 14 0 0 1 19 0" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={faint} />
      <Path d="M5.5 12.5a9.5 9.5 0 0 1 13 0" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={faint} />
      <Path d="M8.75 16a5 5 0 0 1 6.5 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 19.5h.01" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      {kind === 'offline' ? <Path d="M4 4l16 16" stroke={color} strokeWidth={2} strokeLinecap="round" /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  host: { ...StyleSheet.absoluteFill },
});

const useStyles = makeStyles((colors) => ({
  // Snackbar ile aynı düz dil: açık zemin, ince renkli çizgi, hafif gölge.
  card: {
    position: 'absolute',
    left: paddings.md,
    right: paddings.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingLeft: paddings.sm,
    paddingRight: paddings.sm,
    paddingVertical: paddings.sm,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 1 },
  action: { paddingHorizontal: paddings.xs, paddingVertical: 6, minHeight: 32, justifyContent: 'center' },
  close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  compact: { position: 'absolute', left: paddings.md },
  compactInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  compactText: { fontWeight: '600' },
}));
