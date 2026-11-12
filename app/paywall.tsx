import {
  LEGAL_LINKS,
  PAYWALL_REASON_TEXT,
  PREMIUM_FEATURES,
  type PaywallReason,
} from '@/src/core/constants/premium';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { SubscriptionPackage, SubscriptionPeriod } from '@/src/domain/models';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { Screen } from '@/src/widgets/atoms/Screen';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

const PERIOD_LABEL: Record<SubscriptionPeriod, string> = {
  annual: 'Yıllık',
  monthly: 'Aylık',
  lifetime: 'Ömür boyu',
  other: 'Paket',
};

const PERIOD_ORDER: SubscriptionPeriod[] = ['annual', 'monthly', 'lifetime', 'other'];

function annualSavingsPercent(packages: SubscriptionPackage[]): number | null {
  const monthly = packages.find((p) => p.period === 'monthly');
  const annual = packages.find((p) => p.period === 'annual');
  if (!monthly || !annual || monthly.price <= 0) return null;
  const savings = Math.round((1 - annual.price / (monthly.price * 12)) * 100);
  return savings > 0 ? savings : null;
}

export default function PaywallScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { reason } = useLocalSearchParams<{ reason?: PaywallReason }>();
  const {
    isPremium,
    configured,
    canSimulate,
    packages,
    packagesLoading,
    loadPackages,
    purchase,
    restore,
    managementUrl,
    simulatePremium,
  } = useSubscription();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    loadPackages().catch(() => setMessage('Paketler yüklenemedi. Bağlantını kontrol edip tekrar dene.'));
  }, [configured, loadPackages]);

  const sorted = [...packages].sort(
    (a, b) => PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period),
  );
  const selected = sorted.find((p) => p.id === selectedId) ?? sorted[0];
  const savings = annualSavingsPercent(packages);
  const reasonText = reason ? PAYWALL_REASON_TEXT[reason] : undefined;

  const onPurchase = async () => {
    if (!selected) return;
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

  if (isPremium) {
    return (
      <Screen scroll>
        <AppText variant="h1">Pro aktif</AppText>
        <AppText tone="secondary">Tüm Pro özellikler açık. Teşekkürler!</AppText>
        {configured ? (
          <AppButton
            label="Aboneliği yönet"
            variant="secondary"
            onPress={async () => {
              const url = await managementUrl();
              if (url) void Linking.openURL(url);
            }}
          />
        ) : null}
        {canSimulate ? (
          <AppButton label="Simülasyonu kapat" variant="ghost" onPress={() => simulatePremium(false)} />
        ) : null}
        <AppButton label="Kapat" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Badge label="PRO" tone="gold" />
        <AppText variant="h1">Altın Kasam Pro</AppText>
        {reasonText ? (
          <AppText tone="secondary">{reasonText}</AppText>
        ) : (
          <AppText tone="secondary">Kasanı ve piyasayı daha derin takip et.</AppText>
        )}
      </View>

      <View style={styles.features}>
        {PREMIUM_FEATURES.map((f) => (
          <View key={f.id} style={styles.feature}>
            <View style={styles.check}>
              <AppText variant="caption" style={styles.checkText}>✓</AppText>
            </View>
            <View style={styles.featureCopy}>
              <AppText variant="bodyStrong">{f.title}</AppText>
              <AppText variant="caption" tone="secondary">{f.detail}</AppText>
            </View>
          </View>
        ))}
      </View>

      {configured ? (
        packagesLoading && !packages.length ? (
          <ActivityIndicator color={colors.brand.gold} />
        ) : (
          <View style={styles.packages} role="radiogroup" aria-label="Abonelik paketi">
            {sorted.map((pkg) => {
              const active = pkg.id === selected?.id;
              return (
                <Pressable
                  key={pkg.id}
                  onPress={() => setSelectedId(pkg.id)}
                  style={[styles.package, active && styles.packageActive]}
                  role="radio"
                  aria-checked={active}
                >
                  <View style={styles.packageCopy}>
                    <AppText variant="bodyStrong">{PERIOD_LABEL[pkg.period]}</AppText>
                    {pkg.trial ? (
                      <AppText variant="caption" tone="up">{pkg.trial}</AppText>
                    ) : null}
                  </View>
                  <View style={styles.packagePrice}>
                    <AppText variant="bodyStrong">{pkg.priceString}</AppText>
                    {pkg.period === 'annual' && savings ? (
                      <Badge label={`%${savings} tasarruf`} tone="up" />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
            {!sorted.length ? (
              <AppText tone="secondary">Şu anda satın alınabilir paket yok.</AppText>
            ) : null}
          </View>
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

      {message ? (
        <AppText variant="caption" tone="down">{message}</AppText>
      ) : null}

      {configured ? (
        <AppButton
          label={selected?.trial ? 'Ücretsiz denemeyi başlat' : 'Pro’ya geç'}
          loading={busy === 'purchase'}
          disabled={!selected || busy !== null}
          onPress={() => void onPurchase()}
        />
      ) : null}
      {canSimulate ? (
        <AppButton
          label="Pro’yu simüle et (geliştirme)"
          variant="secondary"
          onPress={() => simulatePremium(true)}
        />
      ) : null}
      {configured ? (
        <AppButton
          label="Satın alımları geri yükle"
          variant="ghost"
          loading={busy === 'restore'}
          disabled={busy !== null}
          onPress={() => void onRestore()}
        />
      ) : null}
      <AppButton label="Şimdi değil" variant="ghost" onPress={() => router.back()} />

      <AppText variant="caption" tone="tertiary">
        Ödeme, onayınla birlikte App Store / Google Play hesabından alınır. Abonelik, dönem
        bitiminden en az 24 saat önce iptal edilmediği sürece aynı ücretle otomatik yenilenir;
        mağaza hesap ayarlarından yönetebilir veya iptal edebilirsin. Fiyatlar yatırım tavsiyesi
        değildir.
      </AppText>
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
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { gap: 8, paddingTop: paddings.sm },
  features: { gap: 12 },
  feature: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.goldSoft,
  },
  checkText: { color: colors.brand.goldDeep, fontWeight: '800' },
  featureCopy: { flex: 1, gap: 2 },
  packages: { gap: 10 },
  package: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: paddings.card,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  packageActive: {
    borderColor: colors.brand.gold,
    backgroundColor: colors.surface.goldTint,
  },
  packageCopy: { flex: 1, gap: 2 },
  packagePrice: { alignItems: 'flex-end', gap: 4 },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface.muted,
  },
  links: { flexDirection: 'row', gap: 16 },
}));
