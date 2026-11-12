import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import { portfolioRepository } from '@/src/data/repositories/portfolioRepository';
import { useProGate } from '@/src/viewmodels/subscription/useProGate';
import { fileShareDatasource } from '@/src/data/datasources/fileShareDatasource';
import { buildPortfolioCsv } from '@/src/utils/portfolioCsv';
import { formatGrams, formatMoney, formatNumber, formatPercent, formatSignedMoney } from '@/src/utils/format';
import { useCurrencySwitcher } from '@/src/viewmodels/market/useCurrencySwitcher';
import { useGoalProgress } from '@/src/viewmodels/goal/useGoalProgress';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { usePortfolioChart } from '@/src/viewmodels/portfolio/usePortfolioChart';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { FREE_EXPORT_USES } from '@/src/core/constants/premium';
import { Screen } from '@/src/widgets/atoms/Screen';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { CurrencySwitcher } from '@/src/widgets/molecules/CurrencySwitcher';
import { PORTFOLIO_ALARM_ID } from '@/src/core/constants/alarmAssets';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { VaultEmptyState } from '@/src/widgets/molecules/VaultEmptyState';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { GoalCard } from '@/src/widgets/organisms/GoalCard';
import { VaultDropAnimation } from '@/src/widgets/organisms/VaultDropAnimation';
import { formatAssetQuantity } from '@/src/core/constants/portfolioAssets';
import { HoldingListItem } from '@/src/widgets/organisms/HoldingListItem';
import { PORTFOLIO_GROUP_COLORS } from '@/src/widgets/organisms/PortfolioShareCard';
import { PortfolioChartCard } from '@/src/widgets/organisms/PortfolioChartCard';
import type { PortfolioPosition, PortfolioSnapshot } from '@/src/domain/models';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

function StatTile({
  label,
  value,
  detail,
  tone,
  right,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'up' | 'down';
  /** Sağ sütun: soldan ince çizgiyle ayrılır. */
  right?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={[styles.tile, right && styles.tileRight]}>
      <AppText variant="caption" tone="secondary">{label}</AppText>
      <AppText variant="bodyStrong" tone={tone} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="caption" tone={tone ?? 'tertiary'}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

/** Periyot durumu bu bölümde tutulur; periyot değişince listeler ve hedef yeniden çizilmez. */
function PortfolioChartSection({ snapshot }: { snapshot: PortfolioSnapshot }) {
  const styles = useStyles();
  const chart = usePortfolioChart();
  const currencySwitcher = useCurrencySwitcher();
  const { openPaywall } = useSubscription();
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);
  return (
    <PortfolioChartCard
      snapshot={snapshot}
      chart={chart}
      onLockedTimeframe={onLockedTimeframe}
      headerRight={
        <View style={styles.chartActions}>
          <CurrencySwitcher {...currencySwitcher} compact />
          <AlarmButton
            assetId={PORTFOLIO_ALARM_ID}
            onPress={() => router.push({ pathname: '/alarm', params: { assetId: PORTFOLIO_ALARM_ID } })}
            accessibilityLabel="Kasa toplam değeri için alarm"
          />
        </View>
      }
      title="Toplam varlık"
      height={220}
      bare
    />
  );
}

/** Kasam: kısa hedef, toplam varlık grafiği, özet, varlıklar ve dağılım. */
export default function PortfolioScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, error, snapshot, refresh, removeHolding } = usePortfolioViewModel();
  const currencySwitcher = useCurrencySwitcher();
  const goalProgress = useGoalProgress();
  const breakdown = useMemo(() => (snapshot ? portfolioRepository.breakdown(snapshot) : null), [snapshot]);
  const openPosition = useCallback(
    (p: PortfolioPosition) => router.push({ pathname: '/position/[assetId]', params: { assetId: p.assetId } }),
    [],
  );
  const addMore = useCallback(
    (p: PortfolioPosition) =>
      router.push({ pathname: '/add-holding', params: { assetId: p.assetId } }),
    [],
  );
  const [withdrawal, setWithdrawal] = useState<{ assetId: string; subtitle: string } | null>(null);
  const confirmRemove = useCallback(
    (p: PortfolioPosition) => {
      const count = p.holdings.length;
      const message =
        count > 1
          ? `${p.label} için ${count} alımın tamamı (${formatNumber(p.quantity)}) kasadan çıkarılsın mı?`
          : `${p.label} (${formatNumber(p.quantity)}) kasadan çıkarılsın mı?`;
      const removeAll = async () => {
        for (const h of p.holdings) await removeHolding(h.id);
        setWithdrawal({ assetId: p.assetId, subtitle: `${p.label} · ${formatAssetQuantity(p.assetId, p.quantity)}` });
      };
      if (Platform.OS === 'web') {
        if (window.confirm(message)) void removeAll();
        return;
      }
      Alert.alert('Kasadan çıkar', message, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Çıkar', style: 'destructive', onPress: () => void removeAll() },
      ]);
    },
    [removeHolding],
  );

  const csvGate = useProGate('csv');
  const imageGate = useProGate('image');
  const { guard: guardCsv, consume: consumeCsv } = csvGate;
  const { guard: guardImage } = imageGate;
  const exportCsv = useCallback(async () => {
    if (!snapshot || !(await guardCsv())) return;
    try {
      await consumeCsv();
      const stamp = new Date().toISOString().slice(0, 10);
      const ok = await fileShareDatasource.shareText(
        `altin-kasam-${stamp}.csv`,
        buildPortfolioCsv(snapshot),
        'text/csv',
        'Kasamı dışa aktar',
      );
      if (!ok) Alert.alert('Paylaşım kullanılamıyor', 'Bu cihazda paylaşım menüsü açılamadı.');
    } catch {
      Alert.alert('Dışa aktarılamadı', 'Lütfen tekrar dene.');
    }
  }, [snapshot, guardCsv, consumeCsv]);
  const openShare = useCallback(async () => {
    if (await guardImage()) router.push('/share-vault');
  }, [guardImage]);

  const goal = <GoalCard progress={goalProgress} onEdit={() => router.push('/goal')} compact />;
  // Son varlık çıkarılınca ekran boş duruma geçer; animasyon iki durumda da çizilir.
  const withdrawalAnimation = withdrawal ? (
    <VaultDropAnimation
      mode="withdraw"
      title="Kasadan çıkarıldı"
      subtitle={withdrawal.subtitle}
      assetId={withdrawal.assetId}
      onDone={() => setWithdrawal(null)}
    />
  ) : null;

  if (!snapshot || !breakdown || !snapshot.holdings.length) {
    return (
      <Screen scroll onRefresh={() => void refresh()} refreshing={state === 'loading'}>
        {goal}
        <CurrencySwitcher {...currencySwitcher} />
        {state === 'loading' && !snapshot ? <ActivityIndicator color={colors.brand.gold} /> : null}
        {state === 'error' ? (
          <EmptyState
            title="Kasan yüklenemedi"
            message={error ?? 'Bilinmeyen hata'}
            actionLabel="Yenile"
            onAction={() => void refresh()}
          />
        ) : null}
        {state === 'ready' ? <VaultEmptyState onAdd={() => router.push('/add-holding')} /> : null}
        {withdrawalAnimation}
      </Screen>
    );
  }

  const currency = snapshot.currency;

  return (
    <Screen
      scroll
      onRefresh={() => void refresh()}
      refreshing={state === 'loading'}
    >
      {goal}
      <PortfolioChartSection snapshot={snapshot} />

      <View style={styles.grid}>
        <StatTile
          label="Toplam kâr / zarar"
          value={formatSignedMoney(snapshot.pnl, currency)}
          detail={`${formatPercent(snapshot.pnlPercent)} · maliyete göre`}
          tone={snapshot.pnl >= 0 ? 'up' : 'down'}
        />
        <StatTile
          right
          label="Bugünkü kâr / zarar"
          value={formatSignedMoney(snapshot.dayPnl, currency)}
          detail={`${formatPercent(snapshot.dayPnlPercent)} · düne göre`}
          tone={snapshot.dayPnl >= 0 ? 'up' : 'down'}
        />
        <StatTile label="Toplam maliyet" value={formatMoney(snapshot.totalCost, currency)} detail="Alış fiyatlarıyla" />
        <StatTile
          right
          label="Altın karşılığı"
          value={formatGrams(breakdown.pureGrams)}
          detail="24 ayar gram"
        />
      </View>

      <SectionHeader title="Varlıklarım" subtitle="Ortalama maliyete göre kâr/zarar" />
      <View style={styles.list}>
        {snapshot.positions.map((p) => (
          <HoldingListItem
            key={p.assetId}
            position={p}
            currency={currency}
            onOpen={openPosition}
            onAddMore={addMore}
            onRemove={confirmRemove}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <AppButton label="Görsel oluştur" variant="secondary" style={styles.flex} onPress={() => void openShare()} />
        <AppButton label="CSV dışa aktar" variant="secondary" style={styles.flex} onPress={() => void exportCsv()} />
      </View>
      {!csvGate.isPremium ? (
        <View style={styles.proNote}>
          <ProMark />
          <AppText variant="caption" tone="secondary" style={styles.flex}>
            {csvGate.remaining || imageGate.remaining
              ? `Ücretsiz planda her biri ${FREE_EXPORT_USES} kez kullanılabilir · kalan: görsel ${imageGate.remaining ?? 0}, CSV ${csvGate.remaining ?? 0}`
              : 'Ücretsiz haklarını kullandın; sınırsız kullanım Pro’da.'}
          </AppText>
        </View>
      ) : null}

      <SectionHeader title="Dağılım" subtitle="Ürün türlerine göre güncel değer" />
      <View style={styles.card}>
        <View style={styles.bar} accessibilityLabel="Ürün türlerine göre dağılım">
          {breakdown.groups.map((g) => (
            <View key={g.id} style={{ flex: g.share, backgroundColor: PORTFOLIO_GROUP_COLORS[g.id] }} />
          ))}
        </View>
        {breakdown.groups.map((g) => (
          <View key={g.id} style={styles.group}>
            <View style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: PORTFOLIO_GROUP_COLORS[g.id] }]} />
              <AppText variant="body" style={styles.flex}>
                {g.label}
                {g.unit ? (
                  <AppText variant="caption" tone="tertiary">
                    {' · '}
                    {formatNumber(g.quantity)} {g.unit}
                  </AppText>
                ) : g.summary ? (
                  <AppText variant="caption" tone="tertiary">
                    {' · '}
                    {g.summary}
                  </AppText>
                ) : null}
              </AppText>
              <AppText variant="bodyStrong">{formatMoney(g.value, currency)}</AppText>
              <AppText variant="caption" tone="secondary" style={styles.percent}>
                %{Math.round(g.share * 100)}
              </AppText>
            </View>
            {g.items?.length ? (
              <View style={[styles.subList, { borderLeftColor: PORTFOLIO_GROUP_COLORS[g.id] }]}>
                {g.items.map((item) => (
                  <View key={item.id} style={styles.legendRow}>
                    <AppText variant="caption" tone="secondary" style={styles.flex}>
                      {item.label}
                      <AppText variant="caption" tone="tertiary">
                        {` · ${item.amount}`}
                      </AppText>
                    </AppText>
                    <AppText variant="caption" tone="primary" style={styles.subValue}>
                      {formatMoney(item.value, currency)}
                    </AppText>
                    <AppText variant="caption" tone="tertiary" style={styles.percent}>
                      %{Math.round(item.share * 100)}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {withdrawalAnimation}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  chartActions: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  // Özet: kart yerine ince çizgilerle ayrılmış iki sütunlu düz tablo.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  tile: {
    width: '50%',
    gap: 2,
    paddingVertical: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  tileRight: { paddingLeft: paddings.md },
  card: { gap: 10 },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  group: { gap: 6 },
  // Alt kırılım grubun rengiyle girintili; nokta yerine sol çizgi.
  subList: { gap: 4, marginLeft: 4, paddingLeft: paddings.sm, borderLeftWidth: 2 },
  subValue: { fontWeight: '600' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  percent: { width: 40, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: paddings.sm },
  proNote: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
}));
