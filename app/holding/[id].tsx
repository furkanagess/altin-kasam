import { formatPercent, formatTRY } from '@/src/utils/format';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { Screen } from '@/src/widgets/atoms/Screen';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

export default function HoldingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, removeHolding } = usePortfolioViewModel();
  const [busy, setBusy] = useState(false);
  const holding = snapshot?.holdings.find((h) => h.id === id);

  if (!holding) {
    return (
      <Screen>
        <AppText>Holding bulunamadı</AppText>
      </Screen>
    );
  }

  const up = holding.pnl >= 0;

  return (
    <Screen scroll>
      <SectionHeader title={holding.label} subtitle={`${holding.quantity} adet`} />
      <View style={{ gap: 8 }}>
        <AppText variant="price">{formatTRY(holding.marketValue)}</AppText>
        <Badge label={`P&L ${formatPercent(holding.pnlPercent)}`} tone={up ? 'up' : 'down'} />
        <AppText tone="secondary">
          Birim piyasa: {formatTRY(holding.unitPrice)}
        </AppText>
        <AppText tone="secondary">
          Alış: {formatTRY(holding.costBasisPerUnit)} · Toplam maliyet{' '}
          {formatTRY(holding.costTotal)}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Alım tarihi: {new Date(holding.boughtAt).toLocaleString('tr-TR')}
        </AppText>
      </View>
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
    </Screen>
  );
}
