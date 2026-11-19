import { APP_LANDING_URL } from '@/src/core/constants/stores';
import { getGoldAsset } from '@/src/core/constants/goldAssets';
import type { Currency } from '@/src/core/constants/app';
import {
  DEFAULT_HOME_WIDGET_OPTION_ID,
  HOME_WIDGET_OPTIONS,
  SILVER_WIDGET_OPTION_ID,
  type HomeWidgetOption,
} from '@/src/core/constants/homeWidget';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { GoldForm, MetalSymbol } from '@/src/domain/enums';
import type { HomeWidgetProps } from '@/src/domain/models';
import { formatMoney } from '@/src/utils/format';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useHomeWidget } from '@/src/viewmodels/widget/HomeWidgetProvider';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import { GoldAssetIcon } from '@/src/widgets/atoms/GoldAssetIcon';
import { MetalIcon } from '@/src/widgets/atoms/MetalIcon';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import { Screen } from '@/src/widgets/atoms/Screen';
import { SectionHeader } from '@/src/widgets/molecules/SectionHeader';
import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

const ROW_ICON_WIDTH = 36;

const ADD_STEPS: Record<'ios' | 'android', string[]> = {
  ios: [
    'Ana ekranda boş bir alana basılı tut.',
    'Sol üstteki “Düzenle”ye, ardından “Widget ekle”ye dokun.',
    'Listeden “Altın Kasam”ı seç ve widget’ı yerleştir.',
  ],
  android: [
    'Ana ekranda boş bir alana basılı tut.',
    '“Widget’lar”a dokun.',
    '“Altın Kasam”ı bul, widget’ı basılı tutup ana ekrana sürükle.',
  ],
};

/** Ana ekrandaki widget'ın uygulama içi benzeri; yerleşim `PriceWidget.ios.tsx` ile aynı. */
function WidgetPreview({ props }: { props: HomeWidgetProps | null }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const accent = props?.metal === 'silver' ? colors.metal.silver : colors.brand.goldDeep;
  const up = props?.up !== false;
  return (
    <View style={styles.preview}>
      <View style={styles.previewHeader}>
        <View style={styles.flex}>
          <AppText variant="caption" style={[styles.previewTitle, { color: accent }]} numberOfLines={1}>
            {props?.title ?? '—'}
          </AppText>
          <AppText variant="caption" tone="tertiary" style={styles.previewSubtitle} numberOfLines={1}>
            {props?.subtitle}
          </AppText>
        </View>
        <MetalIcon symbol={props?.metal === 'silver' ? MetalSymbol.XAG : MetalSymbol.XAU} size={30} />
      </View>
      <View>
        <AppText variant="h2" numberOfLines={1} adjustsFontSizeToFit style={styles.previewPrice}>
          {props?.price || '—'}
        </AppText>
        <View style={styles.previewFooter}>
          {props?.change ? (
            <View style={[styles.changePill, { backgroundColor: up ? colors.semantic.upSoft : colors.semantic.downSoft }]}>
              <AppText variant="caption" tone={up ? 'up' : 'down'} style={styles.changeText}>
                {props.change}
              </AppText>
            </View>
          ) : null}
          <AppText variant="caption" tone="tertiary" style={styles.small}>
            {props?.updatedAt}
          </AppText>
        </View>
      </View>
    </View>
  );
}

type WidgetGroupId = 'gram' | 'bilezik' | 'ziynet' | 'eski' | 'silver';

const WIDGET_GROUPS: { id: WidgetGroupId; label: string }[] = [
  { id: 'gram', label: 'Gram' },
  { id: 'bilezik', label: 'Bilezik' },
  { id: 'ziynet', label: 'Ziynet' },
  { id: 'eski', label: 'Eski basım' },
  { id: 'silver', label: 'Gümüş' },
];

function widgetGroupOf(id: string): WidgetGroupId {
  const asset = getGoldAsset(id);
  if (!asset) return 'silver';
  if (asset.form === GoldForm.Gram) return 'gram';
  if (asset.form === GoldForm.Bilezik) return 'bilezik';
  return asset.edition === 'eski' ? 'eski' : 'ziynet';
}

function OptionRow({
  option,
  price,
  currency,
  selected,
  first,
  locked,
  onPress,
}: {
  option: HomeWidgetOption;
  price: number;
  currency: Currency;
  selected: boolean;
  first: boolean;
  /** Ücretsiz planda seçilemeyen birim: fiyatın yanında Pro etiketi. */
  locked: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const asset = getGoldAsset(option.id);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, selected && styles.rowSelected, pressed && styles.pressed]}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${option.label}, ${formatMoney(price, currency)}`}
    >
      <View style={styles.rowIcon}>
        {asset ? (
          <GoldAssetIcon asset={asset} size={20} maxWidth={ROW_ICON_WIDTH} />
        ) : (
          <MetalIcon symbol={MetalSymbol.XAG} size={28} />
        )}
      </View>
      <AppText variant="body" numberOfLines={1} style={[styles.rowLabel, selected && styles.bold]}>
        {option.label}
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.rowPrice}>
        {formatMoney(price, currency)}
      </AppText>
      {locked ? (
        <ProMark />
      ) : (
        <View style={[styles.radio, selected && styles.radioOn]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      )}
    </Pressable>
  );
}

export default function HomeWidgetScreen() {
  const styles = useStyles();
  const { available, selectedId, select, preview, locked } = useHomeWidget();
  const { openPaywall } = useSubscription();
  const { displayQuotes, displayGoldRates, currency } = useMarketViewModel();
  const steps = ADD_STEPS[Platform.OS === 'android' ? 'android' : 'ios'];

  const options = HOME_WIDGET_OPTIONS.flatMap((option) => {
    const price =
      option.id === SILVER_WIDGET_OPTION_ID
        ? displayQuotes.find((q) => q.symbol === MetalSymbol.XAG)
        : displayGoldRates.find((r) => r.assetId === option.id);
    return price ? [{ option, price }] : [];
  });

  return (
    <Screen webWidth="readable" scroll>
      {Platform.OS === 'web' ? (
        <AppText tone="secondary" style={styles.center}>
          Widget telefonunun ana ekranında çalışır; kurmak için{' '}
          <AppText tone="gold" onPress={() => void Linking.openURL(APP_LANDING_URL)}>
            uygulamayı telefonuna indir
          </AppText>
          .
        </AppText>
      ) : null}
      <View style={styles.top}>
        <View style={styles.previewWrap}>
          <WidgetPreview props={preview} />
        </View>
        {locked ? (
          <AppText tone="secondary" style={styles.center}>
            Gram altın widget’ı ücretsiz. Pro ile widget’ta istediğin altın türünü ya da gümüşü
            gösterebilir, orta boy widget’ı kullanabilirsin.
          </AppText>
        ) : null}
      </View>

      {locked ? (
        <View style={styles.gate}>
          <AppButton label="Pro’yu incele" variant="secondary" onPress={() => openPaywall('widget')} />
        </View>
      ) : null}

      {!available ? (
        <View style={styles.notice}>
          <AppText variant="caption" tone="secondary">
            Bu sürümde widget kullanılamıyor. Widget’lar Expo Go’da ve web’de çalışmaz; uygulamanın
            development build’i ya da mağaza sürümü gerekir. Seçimin kaydedilir.
          </AppText>
        </View>
      ) : null}

      <SectionHeader title="Widget’ta gösterilecek birim" />
      {WIDGET_GROUPS.map((group) => {
        const items = options.filter(({ option }) => widgetGroupOf(option.id) === group.id);
        if (!items.length) return null;
        return (
          <View key={group.id} style={styles.group}>
            <AppText variant="caption" tone="tertiary" style={styles.groupTitle}>
              {group.label.toLocaleUpperCase('tr-TR')}
            </AppText>
            <View style={styles.card}>
              {items.map(({ option, price }, i) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  price={price.bid}
                  currency={currency}
                  selected={option.id === selectedId}
                  first={i === 0}
                  locked={locked && option.id !== DEFAULT_HOME_WIDGET_OPTION_ID}
                  onPress={() =>
                    locked && option.id !== DEFAULT_HOME_WIDGET_OPTION_ID ? openPaywall('widget') : select(option.id)
                  }
                />
              ))}
            </View>
          </View>
        );
      })}

      <SectionHeader title="Nasıl eklenir?" />
      <View style={[styles.card, styles.steps]}>
        {steps.map((step, i) => (
          <AppText key={step} tone="secondary">
            {i + 1}. {step}
          </AppText>
        ))}
        <AppText variant="caption" tone="tertiary">
          Widget, uygulama açıkken dakikada bir ve uygulamadan çıkarken güncellenir; uygulama
          kapalıyken son gönderilen fiyatı gösterir.
        </AppText>
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  previewWrap: { alignSelf: 'center', borderRadius: 22, overflow: 'hidden' },
  preview: {
    width: 170,
    height: 170,
    padding: paddings.md,
    justifyContent: 'space-between',
    borderRadius: 22,
    backgroundColor: colors.surface.goldTint,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  flex: { flex: 1 },
  previewTitle: { fontWeight: '700', letterSpacing: 0.5 },
  previewSubtitle: { fontSize: 11 },
  previewPrice: { fontVariant: ['tabular-nums'] },
  previewFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  changePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.pill },
  changeText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700' },
  small: { fontSize: 10 },
  top: { gap: paddings.sm, alignItems: 'center' },
  gate: { gap: paddings.sm },
  center: { textAlign: 'center' },
  notice: {
    padding: paddings.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
  group: { gap: 6 },
  groupTitle: { letterSpacing: 0.8, fontWeight: '700', paddingLeft: 2 },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    minHeight: 48,
    paddingHorizontal: paddings.sm,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  rowSelected: { backgroundColor: colors.surface.goldTint },
  pressed: { opacity: 0.85 },
  rowIcon: { width: ROW_ICON_WIDTH, alignItems: 'center' },
  rowLabel: { flex: 1 },
  rowPrice: { fontVariant: ['tabular-nums'] },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.brand.goldDeep },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand.goldDeep },
  steps: { gap: 6, padding: paddings.card },
}));
