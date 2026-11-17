import { CURRENCY_LABELS } from '@/src/core/constants/app';
import { getHomeWidgetOption } from '@/src/core/constants/homeWidget';
import {
  FREE_ALARM_LIMIT,
  FREE_HOLDING_LIMIT,
  PREMIUM_FEATURE_ICONS,
  PREMIUM_FEATURES,
  type PremiumFeatureId,
} from '@/src/core/constants/premium';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { useAlarms } from '@/src/viewmodels/alarm/AlarmProvider';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { usePortfolioViewModel } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useHomeWidget } from '@/src/viewmodels/widget/HomeWidgetProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { Badge } from '@/src/widgets/atoms/Badge';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { Screen } from '@/src/widgets/atoms/Screen';
import { router, type Href } from 'expo-router';
import React from 'react';
import { Linking, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const ICONS = PREMIUM_FEATURE_ICONS;

type FeatureState = {
  /** Kullanıcının bu özelliği şu an nasıl kullandığı. */
  usage: string;
  /** Kullanım ölçülebiliyor ve ücretsiz planın ötesindeyse rozet gösterilir. */
  inUse: boolean;
  action: { label: string; href: Href };
};

function FeatureCard({
  id,
  title,
  detail,
  state,
  unlocked,
}: {
  id: PremiumFeatureId;
  title: string;
  detail: string;
  state: FeatureState;
  unlocked: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.icon}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d={ICONS[id]}
              stroke={colors.brand.goldDeep}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={styles.cardTitle}>
          <AppText variant="bodyStrong">{title}</AppText>
          <AppText variant="caption" tone="secondary">
            {detail}
          </AppText>
        </View>
        {unlocked && state.inUse ? <Badge label="Kullanıyorsun" tone="up" /> : null}
      </View>
      <View style={styles.usage}>
        <AppText variant="caption" tone={unlocked ? 'primary' : 'tertiary'} style={styles.usageText}>
          {unlocked ? state.usage : 'Pro ile açılır'}
        </AppText>
        {unlocked ? (
          <Pressable onPress={() => router.push(state.action.href)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="caption" tone="gold" style={styles.actionText}>
              {`${state.action.label} ›`}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Pro'nun açtığı özellikler ve kullanıcının her birini şu an nasıl kullandığı. */
export default function PremiumBenefitsScreen() {
  const styles = useStyles();
  const { isPremium, configured, managementUrl, openPaywall } = useSubscription();
  const { currency } = useMarketViewModel();
  const { holdings } = usePortfolioViewModel();
  const { activeCount } = useAlarms();
  const widget = useHomeWidget();

  const states: Record<PremiumFeatureId, FeatureState> = {
    insight: {
      usage: 'Altın ve gümüş haberlerinin günlük yönü ve özeti açık.',
      inUse: false,
      action: { label: 'Topluluk beklentisi', href: '/insight' },
    },
    vaultExport: {
      usage: 'CSV dışa aktarma ve paylaşım görseli sınırsız açık.',
      inUse: false,
      action: { label: 'Kasam', href: '/portfolio' },
    },
    weekly: {
      usage: 'Güncel ve bir önceki haftanın analiz raporları Analiz sekmesinde açık.',
      inUse: false,
      action: { label: 'Haftalık analiz', href: '/analytics' },
    },
    calendar: {
      usage: 'Yaklaşan açıklamalar, hatırlatmalar ve karar raporları Analiz sekmesinde açık.',
      inUse: false,
      action: { label: 'Ekonomik takvim', href: '/calendar' },
    },
    widget: {
      usage: widget.available
        ? `Seçili birim: ${getHomeWidgetOption(widget.selectedId)?.label ?? '—'}. Ana ekrana uzun basıp ekleyebilirsin.`
        : 'Bu cihazda ana ekran widget’ı kullanılamıyor.',
      inUse: widget.available,
      action: { label: 'Widget ayarları', href: '/widget' },
    },
    currencies: {
      usage:
        currency === 'TRY'
          ? 'Şu an TL görünümündesin; grafik üzerindeki seçiciden $ veya € seçebilirsin.'
          : `Şu an ${CURRENCY_LABELS[currency]} görünümündesin.`,
      inUse: currency !== 'TRY',
      action: { label: 'Piyasaya git', href: '/' },
    },
    holdings: {
      usage: `Kasanda ${holdings.length} kalem var · ücretsiz planda sınır ${FREE_HOLDING_LIMIT}.`,
      inUse: holdings.length > FREE_HOLDING_LIMIT,
      action: { label: 'Kasam', href: '/portfolio' },
    },
    alarms: {
      usage: `${activeCount} bekleyen fiyat alarmın var · ücretsiz planda sınır ${FREE_ALARM_LIMIT}.`,
      inUse: activeCount > FREE_ALARM_LIMIT,
      action: { label: 'Alarmların', href: '/alarm' },
    },
  };

  return (
    <Screen scroll>
      <View style={[styles.card, styles.hero]}>
        <View style={styles.heroTitle}>
          <AppText variant="h3">{isPremium ? 'Pro aktif' : 'Ücretsiz plan'}</AppText>
          {isPremium ? <ProMark /> : null}
        </View>
        <AppText tone="secondary">
          {isPremium
            ? 'Aboneliğinle açılan özellikler ve her birini şu an nasıl kullandığın aşağıda.'
            : 'Aşağıdaki özellikler Pro ile açılır.'}
        </AppText>
        {isPremium ? (
          configured ? (
            <AppButton
              label="Aboneliği yönet"
              variant="secondary"
              onPress={async () => {
                const url = await managementUrl();
                if (url) void Linking.openURL(url);
              }}
            />
          ) : null
        ) : (
          <AppButton label="Pro’yu incele" onPress={() => openPaywall()} />
        )}
      </View>

      {PREMIUM_FEATURES.map((f) => (
        <FeatureCard key={f.id} id={f.id} title={f.title} detail={f.detail} state={states[f.id]} unlocked={isPremium} />
      ))}
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: paddings.sm,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  hero: { borderColor: colors.brand.goldSoft, backgroundColor: colors.surface.goldTint },
  heroTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: paddings.sm },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldTint,
  },
  cardTitle: { flex: 1, gap: 2 },
  usage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingTop: paddings.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  usageText: { flex: 1 },
  actionText: { fontWeight: '600' },
}));
