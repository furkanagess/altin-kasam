import { pageMetadata } from '@/src/core/web/seo';
import type { GenerateMetadataFunction } from 'expo-router/server';
import { useBreakpoint } from '@/src/core/theme/web';
import { WideColumns } from '@/src/widgets/molecules/WideColumns';
import { isWeeklyAnalysisLocked } from '@/src/core/constants/premium';
import { MARKET_INFO, type MarketInfoId } from '@/src/core/constants/marketInfo';
import { RATIO_ALARM_ID } from '@/src/core/constants/alarmAssets';
import { AlarmButton } from '@/src/widgets/molecules/AlarmButton';
import { makeStyles, paddings, useTheme } from '@/src/core/theme';
import type { EconomicEvent } from '@/src/domain/models';
import { useEconomicCalendar } from '@/src/viewmodels/analysis/EconomicCalendarProvider';
import { useWeeklyAnalyses } from '@/src/viewmodels/analysis/useWeeklyAnalyses';
import { formatNumber } from '@/src/utils/format';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useGoldSilverRatioChart } from '@/src/viewmodels/market/useGoldSilverRatioChart';
import { useMarketTicker } from '@/src/viewmodels/market/useMarketTicker';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { GoldSilverRatioIcon } from '@/src/widgets/atoms/MetalIcon';
import { Screen } from '@/src/widgets/atoms/Screen';
import { TourTarget } from '@/src/widgets/atoms/TourTarget';
import { InfoButton } from '@/src/widgets/molecules/InfoButton';
import { ReportBadge } from '@/src/widgets/molecules/ReportBadge';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import { EconomicCalendarList } from '@/src/widgets/organisms/EconomicCalendarList';
import { GoldSilverRatioCard } from '@/src/widgets/organisms/GoldSilverRatioCard';
import { InfoSheet } from '@/src/widgets/organisms/InfoSheet';
import { MarketTicker } from '@/src/widgets/organisms/MarketTicker';
import { PriceChart } from '@/src/widgets/organisms/PriceChart';
import { WeeklyAnalysisCard } from '@/src/widgets/organisms/WeeklyAnalysisCard';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

const openAnalysis = (id: string) => router.push({ pathname: '/analysis/[id]', params: { id } });

/** Piyasa göstergeleri ve haftalık değerlendirmeler. */
/** Analiz ekranında gösterilen son açıklanan olay sayısı; kalanı Takvim ekranında. */
const RECENT_PREVIEW_COUNT = 2;

/** Sunucu çıktısındaki sayfa başlığı ve açıklaması (arama ve paylaşım önizlemesi). */
export const generateMetadata: GenerateMetadataFunction = () => pageMetadata({ title: 'Altın analizi ve ekonomik takvim', description: 'Altın/gümüş rasyosu, haftalık altın analizi ve Fed, TCMB, enflasyon gibi altını etkileyen ekonomik takvim.', path: '/analytics' });

export default function AnalyticsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { refresh, state } = useMarketViewModel();
  const ticker = useMarketTicker();
  const calendar = useEconomicCalendar();
  const ratioChart = useGoldSilverRatioChart();
  const { isPremium, openPaywall } = useSubscription();
  const reportBadge = useCallback((event: EconomicEvent) => (event.result ? <ReportBadge /> : null), []);
  const openReport = useCallback(
    (event: EconomicEvent) => router.push({ pathname: '/economic-event/[id]', params: { id: event.id } }),
    [],
  );
  const onLockedTimeframe = useCallback(() => openPaywall('timeframe'), [openPaywall]);
  const { analyses, loading } = useWeeklyAnalyses();
  const [info, setInfo] = useState<MarketInfoId | null>(null);
  const [latest, ...past] = analyses;
  const expanded = useBreakpoint() === 'expanded';

  const ratioBlock = (
    <>
      <TourTarget id="analysis-ratio">
      <PriceChart
        points={ratioChart.points}
        currency="USD"
        livePrice={ratioChart.ratio}
        formatValue={formatNumber}
        timeframe={ratioChart.timeframe}
        timeframes={ratioChart.timeframes}
        onTimeframeChange={ratioChart.setTimeframe}
        lockedTimeframes={ratioChart.lockedTimeframes}
        onLockedTimeframe={onLockedTimeframe}
        loading={ratioChart.loading}
        height={180}
        title="Altın/Gümüş rasyosu"
        headerLeft={<GoldSilverRatioIcon />}
        headerRight={
          <AlarmButton
            assetId={RATIO_ALARM_ID}
            onPress={() => router.push({ pathname: '/alarm', params: { assetId: RATIO_ALARM_ID } })}
            accessibilityLabel="Altın/Gümüş rasyosu için alarm"
          />
        }
        bare
        titleRight={<InfoButton label="Altın/Gümüş rasyosu nedir?" onPress={() => setInfo('goldSilverRatio')} />}
      />
      </TourTarget>
    </>
  );
  const calendarBlock = (
    <>
      <TourTarget id="analysis-calendar" style={styles.tourBlock}>
      <SectionHeader
        title="Ekonomik takvim"
        right={<InfoButton label="Ekonomik takvim nedir?" onPress={() => setInfo('economicCalendar')} />}
      />
      {calendar.loading ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : calendar.events.length || calendar.recent.length ? (
        <>
          {calendar.recent.length ? (
            <>
              <EconomicCalendarList
                events={calendar.recent.slice(0, RECENT_PREVIEW_COUNT)}
                reminders={calendar.reminders}
                past
                onOpen={openReport}
                badgeFor={reportBadge}
              />
            </>
          ) : null}
          <Pressable
            onPress={() => router.push('/calendar')}
            style={styles.calendarLink}
            accessibilityRole="button"
            accessibilityLabel="Tüm ekonomik takvim"
          >
            <AppText variant="bodyStrong" tone="gold">
              {calendar.recent.length > RECENT_PREVIEW_COUNT
                ? `Tüm açıklananlar ve takvim (${calendar.recent.length - RECENT_PREVIEW_COUNT} açıklama daha) ›`
                : `Tüm takvim ve olası etkiler (${calendar.events.length}) ›`}
            </AppText>
          </Pressable>
        </>
      ) : calendar.error ? (
        <Pressable onPress={() => void calendar.refresh()} accessibilityRole="button" style={styles.calendarLink}>
          <AppText variant="caption" tone="tertiary">
            Takvim şu an alınamadı.{' '}
            <AppText variant="caption" tone="gold" style={styles.link}>
              Tekrar dene
            </AppText>
          </AppText>
        </Pressable>
      ) : (
        <AppText variant="caption" tone="tertiary">
          Yaklaşan olay yok.
        </AppText>
      )}

      </TourTarget>
    </>
  );
  const weeklyBlock = (
    <>
      {/* Yayımlanmış analiz yoksa bölüm hiç gösterilmez. */}
      <TourTarget id="analysis-weekly" style={styles.tourBlock}>
      {loading || latest ? (
        <SectionHeader
          title="Haftalık analiz"
          pro
          right={<InfoButton label="Haftalık analiz nedir?" onPress={() => setInfo('weeklyAnalysis')} />}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator color={colors.brand.gold} />
      ) : latest ? (
        <>
          <WeeklyAnalysisCard
            analysis={latest}
            locked={isWeeklyAnalysisLocked(0, isPremium)}
            onPress={() => (isWeeklyAnalysisLocked(0, isPremium) ? openPaywall('weekly') : openAnalysis(latest.id))}
          />
          {past.length ? (
            <View style={styles.list}>
              {past.map((a, i) => {
                // `latest` 0. sırada; geçmiş listesi 1. sıradan başlar.
                const locked = isWeeklyAnalysisLocked(i + 1, isPremium);
                return (
                  <WeeklyAnalysisCard
                    key={a.id}
                    analysis={a}
                    dateOnly
                    locked={locked}
                    onPress={() => (locked ? openPaywall('weekly') : openAnalysis(a.id))}
                  />
                );
              })}
            </View>
          ) : null}
        </>
      ) : null}

      </TourTarget>
    </>
  );

  return (
    <View style={styles.root}>
      <MarketTicker items={ticker} />
      <Screen
        scroll
        scrollId="analytics"
        onRefresh={() => {
          void refresh();
          void calendar.refresh();
        }}
        refreshing={state === 'loading'}
      >
        {/* Masaüstünde takvim sağ sütunda sabit durur; telefonda sıra: rasyo, takvim, analiz. */}
        {expanded ? (
          <WideColumns
            main={
              <>
                {ratioBlock}
                {weeklyBlock}
              </>
            }
            aside={calendarBlock}
            asideWidth={420}
            stickyAside
          />
        ) : (
          <>
            {ratioBlock}
            {calendarBlock}
            {weeklyBlock}
          </>
        )}

        <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
          Yatırım tavsiyesi değildir
        </AppText>
      </Screen>
      {info ? (
        <InfoSheet visible {...MARKET_INFO[info]} onClose={() => setInfo(null)}>
          {info === 'goldSilverRatio' && ratioChart.ratio ? (
            <GoldSilverRatioCard ratio={ratioChart.ratio} showTitle={false} />
          ) : null}
        </InfoSheet>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface.canvas },
  link: { fontWeight: '600' },
  tourBlock: { gap: 16 },
  // Önceki haftalar: kart yerine ince çizgilerle ayrılmış düz liste.
  list: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  calendarLink: { alignSelf: 'center', paddingVertical: paddings.xs, marginTop: -paddings.xs },
  disclaimer: { fontSize: 10, fontStyle: 'italic', textAlign: 'center' },
}));
