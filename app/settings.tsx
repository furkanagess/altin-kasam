import { useBreakpoint } from '@/src/core/theme/web';
import { appAlert } from '@/src/core/dialog/appAlert';
import { LEGAL_LINKS } from '@/src/core/constants/premium';
import { FONT_SCALES, makeStyles, paddings, radii, useTheme, type ThemePreference } from '@/src/core/theme';
import { useGoal } from '@/src/viewmodels/goal/GoalProvider';
import { useTour } from '@/src/viewmodels/tour/TourProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { AccountLinkSection } from '@/src/widgets/organisms/AccountLinkSection';
import { useAccount } from '@/src/viewmodels/account/AccountProvider';
import { Screen } from '@/src/widgets/atoms/Screen';
import { ThemePreferenceIcon } from '@/src/widgets/atoms/ThemePreferenceIcon';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

function SettingsRow({
  title,
  detail,
  pro,
  onPress,
}: {
  title: string;
  detail?: string;
  pro?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={pro ? `${title}, Pro` : title}
    >
      <View style={styles.rowText}>
        <View style={styles.rowTitle}>
          <AppText variant="bodyStrong">{title}</AppText>
          {pro ? <ProMark /> : null}
        </View>
        {detail ? (
          <AppText variant="caption" tone="secondary">
            {detail}
          </AppText>
        ) : null}
      </View>
      <AppText variant="bodyStrong" tone="tertiary">›</AppText>
    </Pressable>
  );
}

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'Sistem' },
  { id: 'light', label: 'Açık' },
  { id: 'dark', label: 'Koyu' },
];

function ThemePicker() {
  const styles = useStyles();
  const { preference, setPreference, colors } = useTheme();
  return (
    <View style={styles.segments} role="radiogroup" aria-label="Görünüm">
      {THEME_OPTIONS.map((option) => {
        const selected = option.id === preference;
        return (
          <Pressable
            key={option.id}
            onPress={() => setPreference(option.id)}
            style={[styles.segment, selected && styles.segmentSelected]}
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
          >
            <ThemePreferenceIcon
              preference={option.id}
              color={selected ? colors.brand.goldDeep : colors.text.secondary}
            />
            <AppText variant="bodyStrong" tone={selected ? 'gold' : 'primary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Yazı boyutu: seçenekler kendi boyutunda gösterilir. */
function FontScalePicker() {
  const styles = useStyles();
  const { fontScale, setFontScale } = useTheme();
  return (
    <View style={styles.fontBlock}>
      <View style={styles.segments} role="radiogroup" aria-label="Yazı boyutu">
        {FONT_SCALES.map((option) => {
          const selected = option.id === fontScale;
          return (
            <Pressable
              key={option.id}
              onPress={() => setFontScale(option.id)}
              style={[styles.segment, selected && styles.segmentSelected]}
              role="radio"
              aria-checked={selected}
              aria-label={`Yazı boyutu ${option.label}`}
            >
              {/* Önizleme harfi sabit boyutta ölçeklenir; AppText kullanılmaz ki seçenekler kendi boyutunu göstersin. */}
              <Text style={[styles.fontGlyph, { fontSize: 18 * option.factor }, selected && styles.fontGlyphSelected]}>Aa</Text>
              <AppText variant="caption" tone={selected ? 'gold' : 'secondary'} style={styles.fontLabel}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const styles = useStyles();
  const { isPremium, configured, openPaywall, restore, managementUrl } = useSubscription();
  const { goal } = useGoal();
  const { start: startTour } = useTour();
  const wideWeb = useBreakpoint() !== 'compact';
  const [restoring, setRestoring] = useState(false);
  const { followedSources } = useCommunityViewModel();
  const accountLinking = useAccount();
  const showAccount =
    accountLinking.configured &&
    (accountLinking.account !== null || accountLinking.googleAvailable || accountLinking.appleAvailable);

  const onRestore = async () => {
    setRestoring(true);
    try {
      const restored = await restore();
      appAlert(
        restored ? 'Pro geri yüklendi' : 'Satın alım bulunamadı',
        restored ? 'Tüm Pro özellikler açıldı.' : 'Bu hesapta etkin bir Pro aboneliği yok.',
      );
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Screen scroll>
      {showAccount ? (
        <>
          <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>HESAP</AppText>
          <AccountLinkSection />
        </>
      ) : null}

      <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>GÖRÜNÜM</AppText>
      <ThemePicker />

      <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>YAZI BOYUTU</AppText>
      <FontScalePicker />

      <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>ÜYELİK</AppText>
      <View style={styles.membership}>
        <View style={styles.rowTitle}>
          <AppText variant="h3">{isPremium ? 'Pro aktif' : 'Ücretsiz plan'}</AppText>
          {isPremium ? <ProMark /> : null}
        </View>
        <AppText tone="secondary">
          {isPremium
            ? 'Tüm Pro özellikler açık. Hangilerini nasıl kullandığını avantajlar ekranında görebilirsin.'
            : 'Dolar/euro görünümü, uzun dönem grafikler, topluluk beklentisi ve ana ekran widget’ı Pro’da.'}
        </AppText>
        {isPremium ? (
          <AppButton label="Pro avantajların" onPress={() => router.push('/premium-benefits')} />
        ) : null}
        {isPremium ? (
          configured ? (
            <AppButton
              label="Aboneliği yönet"
              variant="secondary"
              onPress={async () => {
                const url = await managementUrl();
                if (url) void Linking.openURL(url);
              }}
            />
          ) : null
        ) : (
          <AppButton label="Pro’yu incele" onPress={() => openPaywall()} />
        )}
        {configured && !isPremium ? (
          <AppButton
            label="Satın alımları geri yükle"
            variant="ghost"
            loading={restoring}
            onPress={() => void onRestore()}
          />
        ) : null}
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>UYGULAMA</AppText>
      <View style={styles.card}>
        <SettingsRow
          title="Ana ekran widget’ı"
          detail="Seçtiğin birimin fiyatı ana ekranında"
          pro
          onPress={() => router.push('/widget')}
        />
        <View style={styles.divider} />
        <SettingsRow
          title="Haber kaynakları"
          detail={followedSources.size ? `${followedSources.size} kaynak takip ediliyor` : 'Takip ettiğin kaynaktan haber gelince bildirim'}
          onPress={() => router.push('/sources')}
        />
        <View style={styles.divider} />
        <SettingsRow
          title="Yatırım hedefi"
          detail={goal ? `${goal.grams} g · ${goal.period === 'yearly' ? 'yıllık' : 'aylık'}` : 'Hedef belirlenmedi'}
          onPress={() => router.push('/goal')}
        />
        {/* Tur telefon düzenine göredir; geniş web ekranında gösterilmez. */}
        {wideWeb ? null : (
          <>
            <View style={styles.divider} />
            <SettingsRow
              title="Uygulama turu"
              detail="Özellikleri adım adım yeniden gez"
              onPress={startTour}
            />
          </>
        )}
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>DESTEK</AppText>
      <View style={styles.card}>
        <SettingsRow
          title="Öneri veya sorun gönder"
          detail="Fikirlerini, sorularını ve karşılaştığın hataları yaz"
          onPress={() => router.push('/support')}
        />
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.sectionTitle}>HAKKINDA</AppText>
      <View style={styles.card}>
        <SettingsRow
          title="Veri kaynakları"
          detail="Fiyat, takvim ve haber kaynakları"
          onPress={() => router.push('/data-sources')}
        />
        {LEGAL_LINKS.terms ? (
          <>
            <View style={styles.divider} />
            <SettingsRow title="Kullanım koşulları" onPress={() => router.push({ pathname: '/reader', params: { url: LEGAL_LINKS.terms, title: 'Kullanım koşulları' } })} />
          </>
        ) : null}
        {LEGAL_LINKS.privacy ? (
          <>
            <View style={styles.divider} />
            <SettingsRow title="Gizlilik politikası" onPress={() => router.push({ pathname: '/reader', params: { url: LEGAL_LINKS.privacy, title: 'Gizlilik politikası' } })} />
          </>
        ) : null}
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
        Yatırım tavsiyesi değildir
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  segments: { flexDirection: 'row', gap: paddings.xs },
  segment: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: paddings.sm,
    paddingHorizontal: paddings.xxs,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  segmentSelected: { borderColor: colors.brand.gold, backgroundColor: colors.surface.goldTint },
  fontBlock: { gap: paddings.sm },
  fontGlyph: { fontWeight: '700', color: colors.text.secondary },
  fontGlyphSelected: { color: colors.brand.goldDeep },
  fontLabel: { textAlign: 'center' },
  sectionTitle: { letterSpacing: 0.6, marginBottom: -8 },
  // Kart yerine üstte ve altta ince çizgiyle sınırlanan düz liste; yalnızca Görünüm seçicisi kutulu.
  card: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
  },
  membership: { gap: paddings.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingVertical: paddings.sm,
  },
  pressed: { opacity: 0.6 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
  disclaimer: { fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
}));
