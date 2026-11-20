import { appAlert } from '@/src/core/dialog/appAlert';
import { AUTH_PROVIDER_LABELS, type AuthProviderId } from '@/src/core/constants/account';
import { makeStyles, paddings, radii, typography, useTheme } from '@/src/core/theme';
import { LEGAL_LINKS } from '@/src/core/constants/premium';
import { useAccount } from '@/src/viewmodels/account/AccountProvider';
import { router } from 'expo-router';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={16} height={19} viewBox="0 0 814 1000" accessibilityElementsHidden>
      <Path
        fill={color}
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      />
    </Svg>
  );
}

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

/** Apple ve Google'ın marka kurallarına uygun (logo + metin, siyah/beyaz) bağlama butonu. */
function ProviderButton({
  provider,
  loading,
  disabled,
  onPress,
}: {
  provider: AuthProviderId;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { scheme, fontFactor } = useTheme();
  // Apple: açık temada siyah, koyu temada beyaz. Google: her zaman beyaz zemin, ince çerçeve.
  const dark = provider === 'apple' && scheme !== 'dark';
  const fg = dark ? '#FFFFFF' : '#1F1F1F';
  const label = `${AUTH_PROVIDER_LABELS[provider]} ile bağla`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.providerButton,
        dark ? styles.providerDark : styles.providerLight,
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {provider === 'apple' ? <AppleLogo color={fg} /> : <GoogleLogo />}
          <Text
            style={[
              typography.bodyStrong,
              { color: fg, fontSize: typography.bodyStrong.fontSize * fontFactor },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const errorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Bir sorun oluştu, tekrar dene.';

/** Ayarlar > Hesap: Google/Apple ile hesabı bağlama, bağlı hesabı yönetme. */
export function AccountLinkSection() {
  const styles = useStyles();
  const { configured, googleAvailable, appleAvailable, account, linking, link, signOut, deleteAccount } =
    useAccount();
  const [busy, setBusy] = useState<'signOut' | 'delete' | null>(null);

  if (!configured || (!account && !googleAvailable && !appleAvailable)) return null;

  const onLink = async (provider: AuthProviderId) => {
    try {
      const result = await link(provider);
      if (!result) return;
      appAlert(
        'Hesap bağlandı',
        result.restored
          ? 'Hesabındaki veriler bu cihazdakilerle birleştirildi. Kasan, alarmların, aboneliğin ve takiplerin artık hesabında.'
          : 'Kasan, alarmların, aboneliğin, bildirim ve haber takiplerin hesabına taşındı. Yeni bir telefonda aynı hesapla bağlanınca hepsi geri gelir.',
      );
    } catch (error) {
      appAlert('Hesap bağlanamadı', errorMessage(error));
    }
  };

  const onSignOut = () => {
    appAlert(
      'Bağlantıyı kes',
      'Verilerin bu cihazda ve hesabında kalır; değişiklikler artık hesabına yedeklenmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bağlantıyı kes',
          style: 'destructive',
          onPress: async () => {
            setBusy('signOut');
            try {
              await signOut();
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const onDelete = () => {
    appAlert(
      'Hesabı sil',
      'Hesabın ve hesaptaki tüm yedeğin kalıcı olarak silinir. Bu cihazdaki veriler kalır. Aktif bir aboneliğin varsa App Store / Google Play’den ayrıca iptal etmelisin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kalıcı olarak sil',
          style: 'destructive',
          onPress: async () => {
            setBusy('delete');
            try {
              await deleteAccount();
              appAlert('Hesap silindi', 'Hesabın ve yedeğin silindi.');
            } catch (error) {
              appAlert('Hesap silinemedi', errorMessage(error));
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  if (account) {
    const who = account.email ?? account.displayName ?? 'Gizli e-posta';
    return (
      <View style={styles.block}>
        <View style={styles.linked}>
          <View style={styles.badge}>
            {account.provider === 'google' ? <GoogleLogo /> : <AppleLogo color="#1F1F1F" />}
          </View>
          <View style={styles.linkedText}>
            <AppText variant="bodyStrong">{AUTH_PROVIDER_LABELS[account.provider]} hesabı bağlı</AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {who}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" tone="secondary">
          Kasan, alarmların, aboneliğin, bildirim ve haber takiplerin bu hesaba otomatik yedekleniyor.
        </AppText>
        <AppButton label="Bağlantıyı kes" variant="secondary" loading={busy === 'signOut'} disabled={busy !== null} onPress={onSignOut} />
        <AppButton label="Hesabı sil" variant="danger" loading={busy === 'delete'} disabled={busy !== null} onPress={onDelete} />
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <AppText variant="bodyStrong">Hesabını bağla</AppText>
      <AppText variant="caption" tone="secondary">
        Kasan, alarmların, aboneliğin, analiz ve bildirim tercihlerin ile haber takiplerin hesabına taşınsın;
        telefon değişse de kaybolmasın.
      </AppText>
      {/* App Store 1.2: koşullar (sıfır tolerans) giriş / hesap bağlamadan önce gösterilir. */}
      <AppText variant="caption" tone="tertiary">
        Hesabını bağlayarak{' '}
        <AppText
          variant="caption"
          tone="gold"
          accessibilityRole="link"
          onPress={() =>
            router.push({ pathname: '/reader', params: { url: LEGAL_LINKS.terms, title: 'Kullanım koşulları' } })
          }
        >
          Kullanım Koşulları’nı (EULA)
        </AppText>{' '}
        kabul etmiş olursun.
      </AppText>
      {appleAvailable ? (
        <ProviderButton
          provider="apple"
          loading={linking === 'apple'}
          disabled={linking !== null}
          onPress={() => void onLink('apple')}
        />
      ) : null}
      {googleAvailable ? (
        <ProviderButton
          provider="google"
          loading={linking === 'google'}
          disabled={linking !== null}
          onPress={() => void onLink('google')}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  block: { gap: paddings.sm },
  providerButton: {
    minHeight: 48,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: paddings.xs,
    paddingHorizontal: paddings.lg,
  },
  providerDark: { backgroundColor: '#000000' },
  providerLight: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DADCE0' },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.5 },
  linked: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  linkedText: { flex: 1, gap: 2 },
}));
