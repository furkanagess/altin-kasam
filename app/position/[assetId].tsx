import { formatAssetQuantity, getOtherAsset, portfolioQuantityUnit } from '@/src/core/constants/portfolioAssets';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { ValuedHolding } from '@/src/domain/models';
import { formatMoney, formatNumber, formatPercent, formatSignedMoney } from '@/src/utils/format';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { PortfolioAssetIcon } from '@/src/widgets/atoms/PortfolioAssetIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { VaultDropAnimation } from '@/src/widgets/organisms/VaultDropAnimation';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function Stat({ label, value, tone, right }: { label: string; value: string; tone?: 'up' | 'down'; right?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.stat, right && styles.statRight]}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="bodyStrong" tone={tone} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

/** Bir birimin tüm alımları: ortalama maliyet, maliyete göre kâr/zarar ve alım bazında döküm. */
export default function PositionScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { assetId } = useLocalSearchParams<{ assetId: string }>();
  const { snapshot, removeHolding } = usePortfolioViewModel();
  const position = snapshot?.positions.find((p) => p.assetId === assetId);

  /** `last`: birimin son alımıydı; animasyon bitince ekran kapanır. */
  const [withdrawal, setWithdrawal] = useState<{ subtitle: string; last: boolean } | null>(null);
  const holdingCount = position?.holdings.length ?? 0;
  const confirmRemove = (h: ValuedHolding) => {
    const date = dateFormatter.format(new Date(h.boughtAt));
    const message = `${date} tarihli alım (${formatNumber(h.quantity)}) kasadan çıkarılsın mı?`;
    const remove = async () => {
      await removeHolding(h.id);
      setWithdrawal({ subtitle: `${date} alımı · ${formatAssetQuantity(h.assetId, h.quantity)}`, last: holdingCount <= 1 });
    };
    if (Platform.OS === 'web') {
      if (window.confirm(message)) void remove();
      return;
    }
    Alert.alert('Alımı sil', message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const withdrawalAnimation = withdrawal ? (
    <VaultDropAnimation
      mode="withdraw"
      title="Kasadan çıkarıldı"
      subtitle={withdrawal.subtitle}
      assetId={assetId}
      onDone={() => {
        setWithdrawal(null);
        if (withdrawal.last && router.canGoBack()) router.back();
      }}
    />
  ) : null;

  if (!snapshot || !position) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Varlık' }} />
        <EmptyState title="Bu varlık kasanda yok" message="Tüm alımları silinmiş olabilir." />
        {withdrawalAnimation}
      </Screen>
    );
  }

  const currency = snapshot.currency;
  const other = getOtherAsset(position.assetId);
  const tryCash = other?.kind === 'cash' && other.currency === 'TRY';
  const unit = other?.kind === 'cash' ? other.symbol : portfolioQuantityUnit(position.assetId);
  const up = position.pnl >= 0;

  return (
    <Screen
      scroll
      footer={
        <AppButton
          label="Aynı birimden ekle"
          onPress={() => router.push({ pathname: '/add-holding', params: { assetId: position.assetId } })}
        />
      }
    >
      <Stack.Screen options={{ title: position.label }} />

      <View style={styles.card}>
        <View style={styles.heroTop}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor:
                  other?.kind === 'cash'
                    ? colors.surface.muted
                    : other?.kind === 'metal'
                      ? colors.surface.silverBadge
                      : colors.surface.goldBadge,
              },
            ]}
          >
            <PortfolioAssetIcon assetId={position.assetId} size={28} maxWidth={40} />
          </View>
          <AppText variant="caption" tone="secondary" style={styles.flex}>
            {`${formatNumber(position.quantity)} ${unit} · ${dateFormatter.format(new Date(position.firstBoughtAt))} tarihinden beri`}
          </AppText>
        </View>
        <AppText variant="price">{formatMoney(position.marketValue, currency)}</AppText>
        {tryCash ? null : (
          <AppText variant="bodyStrong" tone={up ? 'up' : 'down'}>
            {`${formatSignedMoney(position.pnl, currency)} (${formatPercent(position.pnlPercent)})`}
          </AppText>
        )}
        <View style={styles.grid}>
          <Stat label="Ortalama maliyet" value={formatMoney(position.averageCost, currency)} />
          <Stat right label="Güncel birim (alış)" value={formatMoney(position.unitPrice, currency)} />
          <Stat label="Toplam maliyet" value={formatMoney(position.costTotal, currency)} />
          <Stat right label="Alım sayısı" value={`${position.holdings.length}`} />
        </View>
      </View>

      <SectionHeader title="Alımlar" subtitle="Her alım kendi fiyatına göre" />
      <View style={styles.list}>
        {position.holdings.map((h) => {
          const holdingUp = h.pnl >= 0;
          return (
            <View key={h.id} style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(`/holding/${h.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${dateFormatter.format(new Date(h.boughtAt))}, ${formatNumber(h.quantity)} ${unit}`}
              >
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{dateFormatter.format(new Date(h.boughtAt))}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {tryCash
                      ? `${formatNumber(h.quantity)} ${unit}`
                      : `${formatNumber(h.quantity)} ${unit} × ${formatMoney(h.costBasisPerUnit, currency)}`}
                  </AppText>
                </View>
                <View style={styles.values}>
                  <AppText variant="bodyStrong">{formatMoney(h.marketValue, currency)}</AppText>
                  {tryCash ? null : (
                    <AppText variant="caption" tone={holdingUp ? 'up' : 'down'}>
                      {formatPercent(h.pnlPercent)}
                    </AppText>
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={() => confirmRemove(h)}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel="Alımı sil"
                hitSlop={6}
              >
                <AppText variant="caption" tone="down" style={styles.removeLabel}>
                  Sil
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>

      <AppText variant="caption" tone="tertiary" style={styles.note}>
        {currency !== 'TRY'
          ? 'Ortalama maliyet, alımların miktarla ağırlıklı ortalamasıdır. Alış tutarları TL olarak kaydedilir ve güncel kurla çevrilerek gösterilir.'
          : 'Ortalama maliyet, alımların miktarla ağırlıklı ortalamasıdır; kâr/zarar bozdurma (alış) fiyatıyla hesaplanır.'}
      </AppText>
      {withdrawalAnimation}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  card: { gap: 6 },
  // Özet: kart yerine ince çizgilerle ayrılmış iki sütunlu düz tablo.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: paddings.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  stat: {
    width: '50%',
    gap: 2,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  statRight: { paddingLeft: paddings.md },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, marginBottom: 4 },
  iconBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.xs,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  values: { alignItems: 'flex-end' },
  remove: {
    paddingHorizontal: paddings.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.muted,
  },
  removeLabel: { fontWeight: '600' },
  note: { textAlign: 'center' },
}));
