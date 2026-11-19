import type { Currency } from '@/src/core/constants/app';
import type { DayRange } from '@/src/domain/models';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { formatMoney } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { memo, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

type Props = {
  name: string;
  /** Kuyumcunun alış fiyatı: kullanıcının bozdururken aldığı. */
  bid: number;
  /** Kuyumcunun satış fiyatı: kullanıcının satın alırken ödediği. */
  ask: number;
  currency: Currency;
  /** İsmin altında tek satırlık bilgi (ör. "22 ayar · 1,75 g"). */
  caption?: string;
  /** Alış fiyatının günlük istatistiği; yoksa günün aralığı gösterilmez. */
  day?: DayRange;
  /** Soldaki ikon; sabit genişlikte bir alanda ortalanır, isimler hizalı kalır. */
  icon?: ReactNode;
  /** Düğmelere geri verilir; satırlar memo'lu kalsın diye işleyiciler sabit tutulabilir. */
  id?: string;
  /** Verilirse açık detayın altında "Ekle" düğmesi gösterilir. */
  onAdd?: (id: string) => void;
  /** Verilirse açık detayın altında "Alarm" düğmesi gösterilir. */
  onAlarm?: (id: string) => void;
  /** Verilirse açık detayın altında "Detay" düğmesi gösterilir (grafik ekranı). */
  onDetail?: (id: string) => void;
  /** Verilirse açık/kapalı durumu dışarıdan yönetilir (ör. listede aynı anda tek açık satır). */
  expanded?: boolean;
  onToggle?: (id: string) => void;
};

const DURATION = 200;

const PLUS_PATH = 'M12 5v14M5 12h14';
const CHART_PATH = 'M4 4v16h16M8 15l4-4 3 3 5-6';
const BELL_PATH =
  'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0';

function ActionButton({
  label,
  path,
  primary,
  onPress,
}: {
  label: string;
  path: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = primary ? colors.text.inverse : colors.brand.goldDeep;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.action, primary ? styles.actionPrimary : styles.actionSecondary]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d={path} stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <AppText variant="bodyStrong" style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Güncel alış fiyatının gün içi en düşük–en yüksek aralığındaki yeri. */
function DayRangeLine({ day, bid, currency }: { day: DayRange; bid: number; currency: Currency }) {
  const styles = useStyles();
  // Anlık akış fiyatı REST istatistiğinin dışına taşabilir; aralık ona göre genişler.
  const low = Math.min(day.low, bid);
  const high = Math.max(day.high, bid);
  const position = high > low ? (bid - low) / (high - low) : 0.5;
  return (
    <View style={styles.rangeBlock}>
      <View style={styles.lineText}>
        <AppText variant="bodyStrong">Günün aralığı</AppText>
        <AppText variant="caption" tone="tertiary">
          Bugünkü en düşük ve en yüksek alış
        </AppText>
      </View>
      <View style={styles.rangeTrack}>
        <View style={[styles.rangeFill, { width: `${position * 100}%` }]} />
        <View style={[styles.rangeMarker, { left: `${position * 100}%` }]} />
      </View>
      <View style={styles.rangeLabels}>
        <AppText variant="caption" tone="secondary">
          {formatMoney(low, currency)}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {formatMoney(high, currency)}
        </AppText>
      </View>
    </View>
  );
}

function DetailLine({
  label,
  hint,
  value,
  loss,
}: {
  label: string;
  hint: string;
  value: string;
  /** Kayıp anlamındaki satır (alış–satış farkı) kırmızı gösterilir. */
  loss?: boolean;
}) {
  const styles = useStyles();
  const tone = loss ? 'down' : 'primary';
  return (
    <View style={styles.line}>
      <View style={styles.lineText}>
        <AppText variant="bodyStrong" tone={tone}>
          {label}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {hint}
        </AppText>
      </View>
      <AppText variant="bodyStrong" tone={tone}>
        {value}
      </AppText>
    </View>
  );
}

/** Kapalıyken alış fiyatını; açılınca alış, satış, fark ve günün aralığını açıklamalarıyla gösteren satır. */
export const ExpandablePriceRow = memo(function ExpandablePriceRow({
  name,
  bid,
  ask,
  currency,
  caption,
  day,
  icon,
  id,
  onAdd,
  onAlarm,
  onDetail,
  expanded,
  onToggle,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = expanded ?? internalOpen;
  const toggle = () => (onToggle && id ? onToggle(id) : setInternalOpen((v) => !v));
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(open ? 180 : 0, { duration: DURATION });
  }, [open, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View layout={LinearTransition.duration(DURATION)} style={[styles.card, open && styles.cardOpen]}>
      <Pressable
        onPress={toggle}
        style={[styles.header, open && styles.headerOpen]}
        accessibilityRole="button"
        // Ad görünen metni (ad, alt satır, fiyat) aynen içerir; ekran okuyucu ile görünen metin uyuşur.
        accessibilityLabel={`${[name, caption, formatMoney(bid, currency)].filter(Boolean).join(' ')}, ${open ? 'bilgileri gizle' : 'alış, satış ve farkı göster'}`}
        aria-expanded={open}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <View style={styles.name}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
          </AppText>
          {caption ? (
            <AppText variant="caption" tone="secondary" numberOfLines={1}>
              {caption}
            </AppText>
          ) : null}
        </View>
        <AppText variant="bodyStrong" style={styles.price} numberOfLines={1}>
          {formatMoney(bid, currency)}
        </AppText>
        <Animated.View style={[styles.chevron, chevronStyle]}>
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
            <Path
              d="M6 9l6 6 6-6"
              stroke={colors.brand.goldDeep}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      </Pressable>

      {open ? (
        <Animated.View entering={FadeIn.duration(DURATION)} exiting={FadeOut.duration(120)} style={styles.details}>
          <DetailLine label="Alış" hint="Bozdururken eline geçen" value={formatMoney(bid, currency)} />
          <DetailLine label="Satış" hint="Satın alırken ödediğin" value={formatMoney(ask, currency)} />
          <View style={styles.divider} />
          <DetailLine
            label="Fark"
            hint="Alıp hemen bozdurursan kaybın"
            value={formatMoney(ask - bid, currency)}
            loss
          />
          {day ? (
            <>
              <View style={styles.divider} />
              <DetailLine
                label="Dünkü kapanış"
                hint="Önceki günün son alış fiyatı"
                value={formatMoney(day.previousClose, currency)}
              />
              <View style={styles.divider} />
              <DayRangeLine day={day} bid={bid} currency={currency} />
            </>
          ) : null}
        </Animated.View>
      ) : null}
      {open && id && (onAdd || onAlarm || onDetail) ? (
        <Animated.View entering={FadeIn.duration(DURATION)} exiting={FadeOut.duration(120)} style={styles.actions}>
          {onAdd ? <ActionButton label="Ekle" path={PLUS_PATH} primary onPress={() => onAdd(id)} /> : null}
          {onAlarm ? <ActionButton label="Alarm" path={BELL_PATH} onPress={() => onAlarm(id)} /> : null}
          {onDetail ? <ActionButton label="Detay" path={CHART_PATH} onPress={() => onDetail(id)} /> : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
});

const useStyles = makeStyles((colors) => ({
  // Kapalıyken düz satır (yalnızca alt çizgi); açılınca aynı ölçülerde çerçeveli kart olur.
  // Kenarlık ve iç boşluk her iki durumda aynı: açılınca genişlik ve içerik konumu değişmez.
  card: {
    paddingHorizontal: paddings.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: colors.border.subtle,
  },
  cardOpen: {
    borderColor: colors.brand.goldSoft,
    borderBottomColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
  },
  headerOpen: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: paddings.sm,
    gap: 12,
  },
  icon: { width: 40, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, gap: 2 },
  // Sabit genişlikli rakamlar: fiyat güncellenince sütun genişliği, dolayısıyla satır düzeni değişmez.
  price: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  chevron: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldTint,
  },
  details: { paddingTop: paddings.xxs, paddingBottom: paddings.xs },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: paddings.xs,
  },
  lineText: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
  rangeBlock: { gap: 8, paddingVertical: paddings.xs },
  rangeTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.goldSoft,
    justifyContent: 'center',
  },
  rangeFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: colors.brand.gold },
  rangeMarker: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.surface.elevated,
    backgroundColor: colors.brand.goldDeep,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  // Detay panelinin altında; panelin alt boşluğunun yarısı kadar yaklaşır.
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: paddings.xs,
    marginBottom: paddings.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: paddings.xs,
    borderRadius: radii.md,
  },
  actionPrimary: { backgroundColor: colors.brand.gold },
  actionSecondary: {
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.goldTint,
  },
}));
