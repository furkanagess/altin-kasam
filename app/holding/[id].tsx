import { portfolioQuantityUnit } from '@/src/core/constants/portfolioAssets';
import { formatMoney, formatNumber, formatPercent } from '@/src/utils/format';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { Screen } from '@/src/widgets/atoms/Screen';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

export default function HoldingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, removeHolding } = usePortfolioViewModel();
  const [busy, setBusy] = useState(false);
  const holding = snapshot?.holdings.find((h) => h.id === id);

  if (!holding) {
    return (
      <Screen webWidth="readable">
        <AppText>Varlık bulunamadı</AppText>
      </Screen>
    );
  }

  const up = holding.pnl >= 0;
  const currency = snapshot?.currency ?? 'TRY';

  return (
    <Screen
      webWidth="readable"
      scroll
      footer={
        <AppButton
          label="Kasadan çıkar"
          variant="danger"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await removeHolding(holding.id);
            setBusy(false);
            router.back();
          }}
        />
      }
    >
      <Stack.Screen options={{ title: holding.label }} />
      <SectionHeader
        title={holding.label}
        subtitle={`${formatNumber(holding.quantity)} ${portfolioQuantityUnit(holding.assetId)}`}
      />
      <View style={{ gap: 8 }}>
        <AppText variant="price">{formatMoney(holding.marketValue, currency)}</AppText>
        <Badge label={`P&L ${formatPercent(holding.pnlPercent)}`} tone={up ? 'up' : 'down'} />
        <AppText tone="secondary">
          Birim piyasa: {formatMoney(holding.unitPrice, currency)}
        </AppText>
        <AppText tone="secondary">
          Alış: {formatMoney(holding.costBasisPerUnit, currency)} · Toplam maliyet{' '}
          {formatMoney(holding.costTotal, currency)}
        </AppText>
        {currency !== 'TRY' ? (
          <AppText variant="caption" tone="tertiary">
            Alış tutarı TL olarak kaydedildi; burada güncel kurla çevrilerek gösteriliyor.
          </AppText>
        ) : null}
        <AppText variant="caption" tone="tertiary">
          Alım tarihi: {new Date(holding.boughtAt).toLocaleString('tr-TR')}
        </AppText>
      </View>
    </Screen>
  );
}
