import {
  LEGAL_LINKS,
  PAYWALL_REASON_TEXT,
  type PaywallReason,
} from '@/src/core/constants/premium';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import { feedbackDatasource } from '@/src/data/datasources/feedbackDatasource';
import type { SubscriptionPackage, SubscriptionPeriod } from '@/src/domain/models';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { PaywallFeatureCarousel } from '@/src/widgets/organisms/PaywallFeatureCarousel';
import { PaywallHero } from '@/src/widgets/organisms/PaywallHero';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const PERIOD_LABEL: Record<SubscriptionPeriod, string> = {
  annual: 'Yıllık',
  monthly: 'Aylık',
  lifetime: 'Ömür boyu',
  other: 'Paket',
};

const PERIOD_ORDER: SubscriptionPeriod[] = ['annual', 'monthly', 'lifetime', 'other'];

/** Ayarlar > "Pro ekranını önizle": mağaza yapılandırılmamışsa bu örnek fiyatlar gösterilir, satın alma yapılmaz. */
const DEMO_PACKAGES: SubscriptionPackage[] = [
  { id: 'demo-annual', title: 'Yıllık', priceString: '₺899,99', price: 899.99, period: 'annual', trial: '7 gün ücretsiz' },
  { id: 'demo-monthly', title: 'Aylık', priceString: '₺129,99', price: 129.99, period: 'monthly' },
];

function annualSavingsPercent(packages: SubscriptionPackage[]): number | null {
  const monthly = packages.find((p) => p.period === 'monthly');
  const annual = packages.find((p) => p.period === 'annual');
  if (!monthly || !annual || monthly.price <= 0) return null;
  const savings = Math.round((1 - annual.price / (monthly.price * 12)) * 100);
  return savings > 0 ? savings : null;
}

const RENEWAL_UNIT: Partial<Record<SubscriptionPeriod, string>> = { annual: 'yıl', monthly: 'ay' };

/**
 * Seçili paketin ödeme açıklaması, düğmenin hemen üstünde: deneme varsa "7 gün ücretsiz, sonra
 * ₺X/yıl" ve hatırlatma sözü; otomatik yenilenen pakette iptal bilgisi. Ömür boyu pakette yok.
 */
function billingNote(pkg: SubscriptionPackage | undefined): string | null {
  if (!pkg) return null;
  const unit = RENEWAL_UNIT[pkg.period];
  if (!unit) return null;
  if (pkg.trial) {
    return `${pkg.trial}, sonra ${pkg.priceString}/${unit}. Deneme bitmeden 1 gün önce hatırlatırız; istediğin zaman iptal edebilirsin.`;
  }
  return `${pkg.priceString}/${unit}, otomatik yenilenir. İstediğin zaman iptal edebilirsin.`;
}

function isPaywallReason(value: string | undefined): value is PaywallReason {
  return value !== undefined && value in PAYWALL_REASON_TEXT;
}

/** Yıllık paketin aylık karşılığı; mağaza fiyat metnindeki sayı aynı biçimle değiştirilir (para birimi korunur). */
function perMonthLabel(pkg: SubscriptionPackage): string | null {
  if (pkg.period !== 'annual' || pkg.price <= 0) return null;
  const match = pkg.priceString.match(/\d[\d.,\s]*\d|\d/);
  if (!match) return null;
  const monthly = (pkg.price / 12).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `ayda ${pkg.priceString.replace(match[0], monthly)}`;
}

function CheckIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Paket kartı: seçilince yaylanarak büyür, altın çerçeve ve onay işareti alır. */
function PlanCard({
  pkg,
  active,
  badge,
  onPress,
}: {
  pkg: SubscriptionPackage;
  active: boolean;
  badge?: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const scale = useSharedValue(active ? 1 : 0.97);
  useEffect(() => {
    scale.set(withSpring(active ? 1 : 0.97, { damping: 14, stiffness: 220 }));
  }, [active, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const perMonth = perMonthLabel(pkg);

  return (
    <Animated.View style={[styles.planWrap, animated]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => scale.set(withTiming(0.95, { duration: 90 }))}
        onPressOut={() => scale.set(withSpring(active ? 1 : 0.97, { damping: 14, stiffness: 220 }))}
        style={[styles.plan, active && styles.planActive]}
        role="radio"
        aria-checked={active}
        accessibilityLabel={`${PERIOD_LABEL[pkg.period]}, ${pkg.priceString}${pkg.trial ? `, ${pkg.trial}` : ''}${badge ? `, ${badge}` : ''}`}
      >
        <View style={styles.planHead}>
          <AppText variant="bodyStrong">{PERIOD_LABEL[pkg.period]}</AppText>
          <View style={[styles.radio, active && styles.radioActive]}>
            {active ? <CheckIcon color={colors.text.onGold} size={12} /> : null}
          </View>
        </View>
        <AppText variant="price" style={styles.planPrice} numberOfLines={1} adjustsFontSizeToFit>
          {pkg.priceString}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {perMonth ?? (pkg.period === 'lifetime' ? 'tek seferlik ödeme' : pkg.period === 'monthly' ? 'her ay yenilenir' : ' ')}
        </AppText>
        {pkg.trial ? (
          <AppText variant="caption" tone="up" numberOfLines={1} style={styles.trial}>
            {pkg.trial}
          </AppText>
        ) : null}
      </Pressable>
      {badge ? (
        <View style={styles.planBadge} pointerEvents="none">
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** Satın alma düğmesi: hafifçe "nefes alır", üzerinden düzenli aralıkla ışık geçer. */
function ShimmerCta({ label, loading, disabled, onPress }: { label: string; loading?: boolean; disabled?: boolean; onPress: () => void }) {
  const styles = useStyles();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    sweep.set(
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(1400, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        ),
        -1,
      ),
    );
    breathe.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, sweep, breathe]);
  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: disabled ? 1 : 1 + breathe.get() * 0.015 }] }));
  const shine = useAnimatedStyle(() => ({
    opacity: disabled || loading ? 0 : 1,
    transform: [{ translateX: -80 + sweep.get() * (width + 160) }, { skewX: '-20deg' }],
  }));
  return (
    <Animated.View style={[styles.ctaWrap, wrap]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <AppButton label={label} loading={loading} disabled={disabled} onPress={onPress} style={styles.cta} />
      <Animated.View style={[styles.ctaShine, shine]} pointerEvents="none" />
    </Animated.View>
  );
}

export default function PaywallScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { demo, reason } = useLocalSearchParams<{ demo?: string; reason?: string }>();
  const isDemo = demo === '1';
  // Paywall hangi sebeple açıldıysa ilk satır onu söyler (ör. alarm sınırı, alarm çaldı).
  const reasonText = isPaywallReason(reason) ? PAYWALL_REASON_TEXT[reason] : null;
  const {
    isPremium,
    configured,
    canSimulate,
    packages,
    packagesLoading,
    loadPackages,
    purchase,
    restore,
    simulatePremium,
  } = useSubscription();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    loadPackages().catch(() => setMessage('Paketler yüklenemedi. Bağlantını kontrol edip tekrar dene.'));
  }, [configured, loadPackages]);

  // Gösterim ölçüsü: paketler yüklendiğinde bir kez (hangi offering, hangi paketler, deneme var mı).
  const impressionSent = useRef(false);
  useEffect(() => {
    if (impressionSent.current || !packages.length || isDemo) return;
    impressionSent.current = true;
    analyticsDatasource.track({
      name: 'paywall_impression',
      reason: reason ?? 'direct',
      offering: packages[0]?.offeringId ?? 'unknown',
      packages: packages.map((p) => p.period).join(','),
      hasTrial: packages.some((p) => Boolean(p.trial)),
    });
  }, [packages, reason, isDemo]);

  // Önizlemede gerçek paketler varsa onlar, yoksa örnek fiyatlar gösterilir.
  const usingDemoPackages = isDemo && !packages.length;
  const source = usingDemoPackages ? DEMO_PACKAGES : packages;
  const sorted = [...source].sort((a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period));
  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0];
  const savings = annualSavingsPercent(source);
  const canBuy = configured || isDemo;

  const contentWidth = Math.min(width, 520) - paddings.screen * 2;
  const heroHeight = Math.round(Math.max(120, Math.min(height * 0.19, 180)));

  const demoNotice = (action: string) => {
    feedbackDatasource.success();
    setNotice(`Önizleme modu: ${action} yapılmadı. Gerçek ekranda bu düğme mağaza ödemesini açar.`);
  };

  const onPurchase = async () => {
    if (!selected) return;
    if (isDemo) return demoNotice('satın alma');
    setBusy('purchase');
    setMessage(null);
    try {
      if (await purchase(selected.id)) router.back();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Satın alma tamamlanamadı.');
    } finally {
      setBusy(null);
    }
  };

  const onRestore = async () => {
    if (isDemo) return demoNotice('geri yükleme');
    setBusy('restore');
    setMessage(null);
    try {
      if (await restore()) router.back();
      else setMessage('Bu hesapta aktif bir Pro aboneliği bulunamadı.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Geri yükleme tamamlanamadı.');
    } finally {
      setBusy(null);
    }
  };

  if (isPremium && !isDemo) {
    return (
      <Screen scroll>
        <Stack.Screen options={{ headerShown: true }} />
        <AppText variant="h1">Pro aktif</AppText>
        <AppText tone="secondary">Tüm Pro özellikler açık. Teşekkürler!</AppText>
        {configured ? (
          <AppButton label="Aboneliği yönet" variant="secondary" onPress={() => router.push('/manage-subscription')} />
        ) : null}
        {canSimulate ? (
          <AppButton label="Simülasyonu kapat" variant="ghost" onPress={() => simulatePremium(false)} />
        ) : null}
        <AppButton label="Kapat" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const ctaLabel = selected?.trial ? 'Ücretsiz denemeyi başlat' : 'Pro’ya geç';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.topBar}>
        {isDemo ? (
          <Animated.View entering={FadeIn.duration(400)} style={styles.demoChip}>
            <Text style={styles.demoChipText}>ÖNİZLEME</Text>
          </Animated.View>
        ) : (
          <View />
        )}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Kapat"
        >
          <CloseIcon color={colors.text.secondary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { width: contentWidth + paddings.screen * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <PaywallHero width={contentWidth} height={heroHeight} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(450)}>
          <AppText variant="brand" style={styles.center}>
            Altın Kasam <Text style={styles.proWord}>Pro</Text>
          </AppText>
          {reasonText ? (
            <AppText tone="secondary" style={[styles.center, styles.reason]}>
              {reasonText}
            </AppText>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.carouselBleed}>
          <PaywallFeatureCarousel width={contentWidth + paddings.screen * 2} />
        </Animated.View>

        {LEGAL_LINKS.terms || LEGAL_LINKS.privacy ? (
          <View style={styles.links}>
            {LEGAL_LINKS.terms ? (
              <AppText variant="caption" tone="gold" onPress={() => void Linking.openURL(LEGAL_LINKS.terms)}>
                Kullanım Şartları
              </AppText>
            ) : null}
            {LEGAL_LINKS.privacy ? (
              <AppText variant="caption" tone="gold" onPress={() => void Linking.openURL(LEGAL_LINKS.privacy)}>
                Gizlilik Politikası
              </AppText>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, paddings.md) }]}>
        {canBuy ? (
          packagesLoading && !source.length ? (
            <ActivityIndicator color={colors.brand.gold} style={styles.loader} />
          ) : (
            <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.plans} role="radiogroup" aria-label="Abonelik paketi">
              {sorted.map((pkg) => (
                <PlanCard
                  key={pkg.id}
                  pkg={pkg}
                  active={pkg.id === selected?.id}
                  badge={pkg.period === 'annual' ? (savings ? `%${savings} TASARRUF` : 'EN AVANTAJLI') : undefined}
                  onPress={() => {
                    if (pkg.id !== selected?.id) feedbackDatasource.select();
                    setSelectedId(pkg.id);
                  }}
                />
              ))}
              {!sorted.length ? <AppText tone="secondary">Şu anda satın alınabilir paket yok.</AppText> : null}
            </Animated.View>
          )
        ) : (
          <View style={styles.notice}>
            <AppText variant="caption" tone="secondary">
              {__DEV__
                ? 'Satın alma yapılandırılmadı: .env.example dosyasını .env.local olarak kopyalayıp RevenueCat anahtarlarını girin.'
                : 'Satın alma şu anda kullanılamıyor.'}
            </AppText>
          </View>
        )}

        {usingDemoPackages ? (
          <AppText variant="caption" tone="tertiary" style={styles.center}>
            Örnek fiyatlar · gerçek fiyatlar mağazadan gelir
          </AppText>
        ) : null}
        {message ? (
          <AppText variant="caption" tone="down" style={styles.center}>
            {message}
          </AppText>
        ) : null}
        {notice ? (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.demoNotice}>
            <AppText variant="caption" tone="gold" style={styles.center}>
              {notice}
            </AppText>
          </Animated.View>
        ) : null}
        {canBuy && billingNote(selected) ? (
          <AppText variant="caption" tone="secondary" style={styles.center}>
            {billingNote(selected)}
          </AppText>
        ) : null}
        {canBuy ? (
          <ShimmerCta
            label={ctaLabel}
            loading={busy === 'purchase'}
            disabled={!selected || busy !== null}
            onPress={() => void onPurchase()}
          />
        ) : null}
        <View style={styles.footerLinks}>
          {canBuy ? (
            <AppText
              variant="caption"
              tone="gold"
              onPress={busy ? undefined : () => void onRestore()}
              accessibilityRole="button"
            >
              {busy === 'restore' ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'}
            </AppText>
          ) : null}
          {canBuy ? <AppText variant="caption" tone="tertiary">·</AppText> : null}
          <AppText variant="caption" tone="tertiary" onPress={() => router.back()} accessibilityRole="button">
            Şimdi değil
          </AppText>
        </View>
        {canSimulate && !isDemo ? (
          <AppButton label="Pro’yu simüle et (geliştirme)" variant="ghost" onPress={() => simulatePremium(true)} />
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  reason: { marginTop: paddings.xs },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: paddings.screen,
    paddingVertical: paddings.xs,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  pressed: { opacity: 0.6 },
  demoChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.goldTint,
    borderWidth: 1,
    borderColor: colors.brand.gold,
  },
  demoChipText: { color: colors.brand.goldDeep, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  scroll: { flex: 1 },
  content: {
    alignSelf: 'center',
    paddingHorizontal: paddings.screen,
    paddingBottom: paddings.lg,
    gap: paddings.md,
  },
  center: { textAlign: 'center' },
  proWord: { color: colors.brand.gold },
  carouselBleed: { marginHorizontal: -paddings.screen },


  loader: { paddingVertical: paddings.md },
  plans: { flexDirection: 'row', flexWrap: 'wrap', gap: paddings.xs, paddingTop: paddings.xs, paddingBottom: 4 },
  planWrap: { flex: 1, minWidth: '30%' },
  plan: {
    gap: 2,
    padding: paddings.sm,
    paddingTop: paddings.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  planActive: { borderColor: colors.brand.gold, backgroundColor: colors.surface.goldTint },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planPrice: { marginTop: 2 },
  trial: { fontWeight: '700' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.brand.gold, backgroundColor: colors.brand.gold },
  planBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.brand.gold,
  },
  planBadgeText: { color: colors.text.onGold, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  notice: { padding: 12, borderRadius: 12, backgroundColor: colors.surface.muted },
  links: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  footer: {
    gap: paddings.xs,
    paddingHorizontal: paddings.screen,
    paddingTop: paddings.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.surface.canvas,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  demoNotice: { padding: 10, borderRadius: radii.md, backgroundColor: colors.surface.goldTint },
  ctaWrap: { borderRadius: radii.md, overflow: 'hidden' },
  cta: { minHeight: 54 },
  ctaShine: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    left: 0,
    width: 46,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 4 },
}));
