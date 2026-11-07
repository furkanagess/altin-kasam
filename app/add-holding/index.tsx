import { GOLD_ASSETS } from '@/src/core/constants/goldAssets';
import { colors, paddings, radii } from '@/src/core/theme';
import { MetalSymbol } from '@/src/domain/enums';
import { formatTRY } from '@/src/utils/format';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Screen } from '@/src/widgets/atoms/Screen';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

export default function AddHoldingScreen() {
  const { quotes } = useMarketViewModel();
  const { addHolding } = usePortfolioViewModel();
  const [assetId, setAssetId] = useState(GOLD_ASSETS[4]?.id ?? GOLD_ASSETS[0].id);
  const [quantity, setQuantity] = useState('1');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggested = useMemo(() => {
    const asset = GOLD_ASSETS.find((a) => a.id === assetId);
    const xau = quotes.find((q) => q.symbol === MetalSymbol.XAU)?.bid ?? 0;
    if (!asset || xau <= 0) return 0;
    return Number((xau * asset.gramWeight * asset.purity).toFixed(2));
  }, [assetId, quotes]);

  const onSave = async () => {
    const qty = Number(String(quantity).replace(',', '.'));
    const rawCost = cost.trim() ? cost : String(suggested);
    const costBasis = Number(String(rawCost).replace(',', '.'));
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Geçerli bir adet girin');
      return;
    }
    if (!Number.isFinite(costBasis) || costBasis <= 0) {
      setError('Piyasa fiyatı henüz hazır değil; birkaç saniye sonra tekrar dene veya fiyat gir.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addHolding({
        assetId,
        quantity: qty,
        costBasisPerUnit: costBasis,
      });
      // Her zaman portföy sekmesine dön — history bazen Piyasa'ya düşüyor.
      router.replace('/(tabs)/portfolio');

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <SectionHeader
        title="Altın ekle"
        subtitle="Ayar ve forma göre sanal holding oluştur"
      />

      <AppText variant="h3">Varlık türü</AppText>
      <View style={styles.assets}>
        {GOLD_ASSETS.map((asset) => {
          const active = asset.id === assetId;
          return (
            <Pressable
              key={asset.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              hitSlop={6}
              onPress={() => setAssetId(asset.id)}
              style={[
                styles.assetChip,
                active && styles.assetChipActive,
                Platform.OS === 'web' ? styles.webCursor : null,
              ]}
            >
              <AppText
                variant="caption"
                pointerEvents="none"
                style={{ color: active ? colors.text.onGold : colors.text.primary }}
              >
                {asset.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="h3">Adet</AppText>
      <TextInput
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholder="1"
        placeholderTextColor={colors.text.tertiary}
      />

      <AppText variant="h3">Alış fiyatı (TRY / adet)</AppText>
      <TextInput
        value={cost}
        onChangeText={setCost}
        keyboardType="decimal-pad"
        style={styles.input}
        placeholder={
          suggested > 0 ? `Öneri: ${formatTRY(suggested)}` : 'Piyasa fiyatı yükleniyor…'
        }
        placeholderTextColor={colors.text.tertiary}
      />
      <AppText variant="caption" tone="secondary">
        {suggested > 0
          ? `Boş bırakırsan güncel piyasa önerisi kullanılır: ${formatTRY(suggested)}`
          : 'Canlı fiyat gelince öneri otomatik dolar.'}
      </AppText>

      {error ? (
        <AppText tone="down" variant="caption">
          {error}
        </AppText>
      ) : null}

      <AppButton
        label="Kasaya ekle"
        loading={saving}
        disabled={saving}
        onPress={() => {
          void onSave();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  assets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assetChip: {
    paddingHorizontal: paddings.sm,
    paddingVertical: paddings.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
  },
  assetChipActive: {
    backgroundColor: colors.brand.gold,
    borderColor: colors.brand.gold,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.md,
    paddingHorizontal: paddings.md,
    paddingVertical: paddings.sm,
    fontSize: 16,
    color: colors.text.primary,
  },
  webCursor: {
    cursor: 'pointer',
  } as import('react-native').ViewStyle,
});

