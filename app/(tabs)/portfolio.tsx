import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { Screen } from '@/src/widgets/atoms/Screen';
import { BrandHeader } from '@/src/widgets/molecules/BrandHeader';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { HoldingRow } from '@/src/widgets/organisms/HoldingRow';
import { PortfolioSummary } from '@/src/widgets/organisms/PortfolioSummary';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/src/core/theme';

export default function PortfolioScreen() {
  const { state, error, snapshot, refresh } = usePortfolioViewModel();
  const holdings = snapshot?.holdings ?? [];

  return (
    <Screen scroll onRefresh={() => void refresh()} refreshing={state === 'loading'}>
      <BrandHeader />
      <SectionHeader
        title="Sanal portföy"
        subtitle="Kasana altın ekle, canlı fiyatla takip et"
        right={
          <AppButton
            label="Altın ekle"
            onPress={() => router.push('/add-holding')}
            style={{ minHeight: 40, paddingHorizontal: 12 }}
          />
        }
      />

      {state === 'loading' && !snapshot ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : null}

      {state === 'error' ? (
        <EmptyState
          title="Portföy yüklenemedi"
          message={error ?? 'Bilinmeyen hata'}
          actionLabel="Yenile"
          onAction={() => void refresh()}
        />
      ) : null}

      {snapshot && holdings.length > 0 ? (
        <>
          <PortfolioSummary snapshot={snapshot} />
          <SectionHeader title="Holdingler" subtitle={`${holdings.length} kalem`} />
          <View style={styles.list}>
            {holdings.map((h) => (
              <HoldingRow
                key={h.id}
                holding={h}
                onPress={() => router.push(`/holding/${h.id}`)}
              />
            ))}
          </View>
        </>
      ) : null}

      {state === 'ready' && holdings.length === 0 ? (
        <EmptyState
          title="Kasan boş"
          message="İlk çeyrek, gram veya reşat altınını ekleyerek sanal portföyünü oluştur."
          actionLabel="Altın ekle"
          onAction={() => router.push('/add-holding')}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
});
