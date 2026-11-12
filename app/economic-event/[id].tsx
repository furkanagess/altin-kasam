import {
  EVENT_SCENARIO_DISCLAIMER,
  eventScenarios,
  surpriseLabel,
} from '@/src/core/constants/economicCalendar';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { StatementTone } from '@/src/data/datasources/economicReportTypes';
import type { PriceReaction } from '@/src/data/repositories/economicReportRepository';
import { formatPercent } from '@/src/utils/format';
import { useEconomicCalendar } from '@/src/viewmodels/analysis/EconomicCalendarProvider';
import { useEconomicReport } from '@/src/viewmodels/analysis/useEconomicReport';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { FlagIcon } from '@/src/widgets/atoms/FlagIcon';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { MetalSymbol } from '@/src/domain/enums';
import { Screen } from '@/src/widgets/atoms/Screen';
import { EmptyState } from '@/src/widgets/molecules/EmptyState';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Istanbul',
});

const TONE_LABELS: Record<StatementTone, { label: string; tone: 'down' | 'up' | 'neutral' }> = {
  hawkish: { label: 'Sıkı (şahin)', tone: 'down' },
  dovish: { label: 'Gevşek (güvercin)', tone: 'up' },
  balanced: { label: 'Dengeli', tone: 'neutral' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <AppText variant="caption" tone="secondary" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function ExpectationRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.expectationRow}>
      <AppText variant="body" tone="secondary" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={[styles.tabular, strong && styles.expectationStrong]}>
        {value}
      </AppText>
    </View>
  );
}

function ReactionRow({
  symbol,
  label,
  reaction,
  first,
}: {
  symbol: MetalSymbol;
  label: string;
  reaction: PriceReaction | null;
  first?: boolean;
}) {
  const styles = useStyles();
  const up = (reaction?.change ?? 0) >= 0;
  return (
    <View style={[styles.reactionRow, !first && styles.reactionDivider]}>
      <MetalIcon symbol={symbol} size={32} />
      <AppText variant="body" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="h3" tone={reaction ? (up ? 'up' : 'down') : 'tertiary'} style={styles.tabular}>
        {reaction ? `${up ? '▲' : '▼'} ${formatPercent(Number(reaction.change.toFixed(2)))}` : '—'}
      </AppText>
    </View>
  );
}

/** Açıklanmış karar ya da veri raporu: sonuç, altın ve gümüş için anlamı, piyasa tepkisi, resmî metin. */
export default function EconomicEventReportScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isPremium, openPaywall } = useSubscription();
  const { recent } = useEconomicCalendar();
  const { report, analysis, reaction, loading, failed } = useEconomicReport(id, isPremium);
  const event = report?.event ?? recent.find((e) => e.id === id);
  const result = event?.result;

  const hero = event ? (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <FlagIcon country={event.country} width={26} />
        <AppText variant="caption" tone="tertiary" style={styles.flex}>
          {[dateFormatter.format(new Date(event.at)), event.period].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      {result ? (
        <>
          <AppText variant="price" style={styles.tabular}>
            {result.value}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {[result.previous && result.previous !== result.value ? `önceki ${result.previous}` : null, result.detail]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </>
      ) : (
        <AppText tone="tertiary">Sonuç kaynakta henüz yayımlanmadı.</AppText>
      )}
    </View>
  ) : null;

  if (!isPremium) {
    return (
      <Screen scroll footer={<AppButton label="Pro’yu incele" onPress={() => openPaywall('calendar')} />}>
        <Stack.Screen options={{ title: event?.title ?? 'Karar raporu' }} />
        {hero}
        <View style={styles.lockedCard}>
          <View style={styles.toneRow}>
            <AppText variant="bodyStrong" style={styles.flex}>
              Bu olayın analiz raporu hazır
            </AppText>
            <ProMark />
          </View>
          {[
            'Altın ve gümüş için ne anlama geldiği',
            'Açıklamadan sonraki 24 saatte altın ve gümüş fiyat tepkisi',
            event?.kind !== 'rate'
              ? 'Önceki döneme göre değişimin yorumu'
              : event.country === 'US'
                ? 'Karar metninin tonu (sıkı / gevşek), oy dağılımı ve öne çıkan paragraflar'
                : 'Kararın önceki faize göre büyüklüğü ve yönünün yorumu',
            ...(event?.expectation ? ['Sonucun piyasa beklentisine göre değerlendirmesi'] : []),
            'Resmî kaynağa uygulama içinden erişim',
          ].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <AppText variant="body" tone="secondary" style={styles.flex}>
                {item}
              </AppText>
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  if (loading && !event) {
    return (
      <Screen>
        <ActivityIndicator color={colors.brand.gold} />
      </Screen>
    );
  }

  if (failed && !event) {
    return (
      <Screen>
        <EmptyState title="Rapor alınamadı" message="Bu olayın raporuna şu an ulaşılamıyor; biraz sonra tekrar dene." />
      </Screen>
    );
  }

  const source = report?.source;
  const statement = report?.statement;
  const expectation = event?.expectation;
  const expectationLabel = expectation?.kind === 'nowcast' ? 'Tahmin' : 'Beklenti';
  const withBasis = (value: string) => (expectation?.basis ? `${expectation.basis} ${value}` : value);
  const surpriseText = expectation ? surpriseLabel(expectation) : null;
  const reactionLabel = (metal: string) => `${metal} (${reaction?.currency === 'USD' ? 'USD' : 'TL'})`;
  const hours = reaction?.gold?.hours ?? reaction?.silver?.hours;

  return (
    <Screen
      scroll
      footer={
        source ? (
          <AppButton
            label="Resmî kaynağı aç"
            variant="secondary"
            onPress={() => router.push({ pathname: '/reader', params: { url: source.url, title: source.label } })}
          />
        ) : undefined
      }
    >
      <Stack.Screen options={{ title: event?.title ?? 'Karar raporu' }} />
      {hero}

      {analysis ? (
        <>
          <AppText variant="bodyStrong" style={styles.headline}>
            {analysis.headline}
          </AppText>

          {analysis.meaning.length ? (
            <Section title="ALTIN VE GÜMÜŞ İÇİN ANLAMI">
              {analysis.meaning.map((text) => (
                <AppText key={text} variant="body" style={styles.paragraph}>
                  {text}
                </AppText>
              ))}
            </Section>
          ) : null}
        </>
      ) : (
        <ActivityIndicator color={colors.brand.gold} />
      )}

      {event && !result ? (
        <Section title="NE BEKLENMELİ">
          {eventScenarios(event).map((s) => (
            <View key={s.side}>
              <AppText variant="bodyStrong">{s.condition}</AppText>
              <AppText variant="body" tone="secondary">
                {s.effect}
              </AppText>
            </View>
          ))}
          <AppText variant="caption" tone="tertiary">
            {EVENT_SCENARIO_DISCLAIMER}
          </AppText>
        </Section>
      ) : null}

      {expectation ? (
        <Section title="BEKLENTİ">
          <ExpectationRow label={expectationLabel} value={withBasis(expectation.value)} />
          {result ? (
            <ExpectationRow label="Açıklanan" value={withBasis(expectation.actual ?? result.value)} />
          ) : null}
          {result && surpriseText ? (
            <ExpectationRow
              label="Sonuç"
              value={surpriseText.replace(/^./, (c) => c.toLocaleUpperCase('tr-TR'))}
              strong={expectation.surprise !== 'inline'}
            />
          ) : null}
          <AppText variant="caption" tone="tertiary">
            {expectation.kind === 'nowcast'
              ? 'Piyasa anketi değil, verilere dayalı model tahminidir.'
              : 'Katılımcı yanıtlarının ortalaması.'}
          </AppText>
        </Section>
      ) : null}

      {report ? (
        <Section title="PİYASA TEPKİSİ">
          {reaction ? (
            <>
              <View>
                <ReactionRow first symbol={MetalSymbol.XAU} label={reactionLabel('Altın')} reaction={reaction.gold} />
                <ReactionRow symbol={MetalSymbol.XAG} label={reactionLabel('Gümüş')} reaction={reaction.silver} />
              </View>
              <AppText variant="caption" tone="tertiary">
                {hours != null && hours < 24
                  ? `Açıklamadan bu yana (${hours} saat). Fiyat hareketi yalnızca bu açıklamaya bağlı olmayabilir.`
                  : 'Açıklamadan sonraki 24 saat. Fiyat hareketi yalnızca bu açıklamaya bağlı olmayabilir.'}
              </AppText>
            </>
          ) : (
            <ActivityIndicator color={colors.brand.gold} />
          )}
        </Section>
      ) : null}

      {statement ? (
        <Section title="RESMÎ METİNDEN">
          <View style={styles.toneRow}>
            <AppText variant="caption" tone="secondary">
              Metnin tonu
            </AppText>
            <Badge label={TONE_LABELS[statement.tone].label} tone={TONE_LABELS[statement.tone].tone} />
          </View>
          {statement.toneReasons.map((reason) => (
            <View key={reason} style={styles.bulletRow}>
              <View style={styles.bullet} />
              <AppText variant="body" tone="secondary" style={styles.flex}>
                {reason}
              </AppText>
            </View>
          ))}
          <View style={styles.quote}>
            {statement.language === 'en' ? (
              <AppText variant="caption" tone="tertiary">
                Metin İngilizcedir; Türkçe değerlendirme yukarıda.
              </AppText>
            ) : null}
            {statement.paragraphs.map((p) => (
              <AppText key={p} variant="body" tone="secondary" style={styles.paragraph}>
                {p}
              </AppText>
            ))}
          </View>
        </Section>
      ) : null}

      <AppText variant="caption" tone="tertiary" style={styles.disclaimer}>
        Değerlendirme kurallara dayalıdır; yatırım tavsiyesi değildir.
      </AppText>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  hero: {
    gap: 4,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, marginBottom: 4 },
  headline: { lineHeight: 22 },
  section: { gap: 10 },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 1.2,
    paddingBottom: paddings.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  paragraph: { lineHeight: 22 },
  reactionRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, paddingVertical: paddings.xs },
  reactionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  toneRow: { flexDirection: 'row', alignItems: 'center', gap: paddings.xs },
  expectationRow: { flexDirection: 'row', alignItems: 'baseline', gap: paddings.sm },
  expectationStrong: { color: colors.brand.goldDeep },
  bulletRow: { flexDirection: 'row', gap: paddings.sm },
  bullet: { width: 6, height: 6, marginTop: 8, borderRadius: 3, backgroundColor: colors.brand.gold },
  quote: {
    gap: paddings.xs,
    paddingLeft: paddings.sm,
    borderLeftWidth: 2,
    borderLeftColor: colors.brand.goldSoft,
  },
  disclaimer: { textAlign: 'center' },
  lockedCard: {
    gap: 10,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
}));
