import { makeStyles, paddings, radii } from '@/src/core/theme';
import { analyticsDatasource, type CancelReason } from '@/src/data/datasources/analyticsDatasource';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

const REASONS: { id: CancelReason; label: string }[] = [
  { id: 'price', label: 'Fiyatı yüksek buluyorum' },
  { id: 'not_using', label: 'Yeterince kullanmıyorum' },
  { id: 'missing_feature', label: 'Aradığım bir özellik yok' },
  { id: 'other_app', label: 'Başka bir uygulama kullanıyorum' },
  { id: 'temporary', label: 'Şimdilik ara vermek istiyorum' },
  { id: 'other', label: 'Başka bir neden' },
];

/**
 * "Aboneliği yönet"ten önceki kısa ara ekran. Neden seçmek isteğe bağlıdır; kullanıcı her durumda
 * tek dokunuşla mağazanın abonelik sayfasına geçer (iptali zorlaştırmak yok, mağaza kuralı).
 * Seçilen neden yalnızca analitiğe gider ve fiyat / özellik kararlarına veri olur.
 */
export default function ManageSubscriptionScreen() {
  const styles = useStyles();
  const { managementUrl } = useSubscription();
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [busy, setBusy] = useState(false);

  const openStore = async () => {
    setBusy(true);
    try {
      analyticsDatasource.track({ name: 'subscription_manage_opened', reason: reason ?? 'skipped' });
      const url = await managementUrl();
      if (url) await Linking.openURL(url);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          <AppButton label="Mağazada aboneliği yönet" variant="secondary" loading={busy} onPress={() => void openStore()} />
          <AppButton label="Vazgeç" variant="ghost" onPress={() => router.back()} />
        </View>
      }
    >
      <AppText variant="h2">Aboneliğini değiştirmeden önce</AppText>
      <AppText tone="secondary">
        Ayrılma ya da paket değiştirme nedenini paylaşırsan Altın Kasam’ı ona göre geliştiririz. İstersen
        seçmeden devam edebilirsin.
      </AppText>
      <View style={styles.card} role="radiogroup" aria-label="Neden">
        {REASONS.map((item, i) => {
          const selected = item.id === reason;
          return (
            <Pressable
              key={item.id}
              onPress={() => setReason(selected ? null : item.id)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, selected && styles.rowSelected, pressed && styles.pressed]}
              role="radio"
              aria-checked={selected}
            >
              <AppText variant="body" style={[styles.flex, selected && styles.bold]}>
                {item.label}
              </AppText>
              <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" tone="tertiary">
        İptal ya da paket değişikliği App Store veya Google Play’in abonelik sayfasında yapılır. İptal
        edersen Pro, ödenmiş dönemin sonuna kadar açık kalır.
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  footer: { gap: paddings.xs },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, minHeight: 52, paddingHorizontal: paddings.md },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  rowSelected: { backgroundColor: colors.surface.goldTint },
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  bold: { fontWeight: '700' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.brand.gold },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand.gold },
}));
