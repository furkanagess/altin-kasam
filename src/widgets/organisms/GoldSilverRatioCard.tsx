import { makeStyles, paddings, radii } from '@/src/core/theme';
import { formatNumber } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { View } from 'react-native';

/** Ölçeğin uçları; son 30 yılda rasyo büyük ölçüde bu aralıkta kaldı. */
const SCALE_MIN = 40;
const SCALE_MAX = 110;
/** Son 30 yılın kabaca ortalama bandı. */
const BAND_LOW = 60;
const BAND_HIGH = 75;

function interpret(ratio: number): string {
  if (ratio >= 85)
    return 'Rasyo tarihsel bandının belirgin üzerinde: gümüş, altına göre görece ucuz fiyatlanıyor. Geçmişte bu seviyeler çoğunlukla gümüş lehine ortalamaya dönüşle izlendi, ancak dönüşün zamanı belirsizdir.';
  if (ratio > BAND_HIGH)
    return 'Rasyo ortalama bandın üst tarafında: gümüş altına göre hâlâ görece ucuz. Bant içine geri çekilme gümüşün altından daha iyi performans göstermesi anlamına gelir.';
  if (ratio >= BAND_LOW)
    return 'Rasyo uzun vadeli ortalama bandında: iki metal birbirine göre dengeli fiyatlanıyor.';
  return 'Rasyo ortalama bandın altında: altın, gümüşe göre görece ucuz fiyatlanıyor.';
}

type Props = {
  ratio: number;
  /** Başlık ve değer satırı; değer başka yerde (ör. rasyo grafiğinde) gösteriliyorsa kapatılır. */
  showHeader?: boolean;
  /** Yalnızca başlık metni; başlığı taşıyan bir pencerede kapatılır, değer satırı kalır. */
  showTitle?: boolean;
};

/** 1 ons altının kaç ons gümüşe denk geldiği; iki metalin göreli pahalılığını gösterir. */
export function GoldSilverRatioCard({ ratio, showHeader = true, showTitle = true }: Props) {
  const styles = useStyles();
  const percent = (value: number) =>
    ((Math.min(Math.max(value, SCALE_MIN), SCALE_MAX) - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  return (
    <View style={styles.card}>
      {showHeader ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {showTitle ? <AppText variant="h3">Altın/Gümüş rasyosu</AppText> : null}
            <AppText variant="caption" tone="tertiary">
              1 ons altın kaç ons gümüş ediyor
            </AppText>
          </View>
          <AppText variant="price">{formatNumber(ratio)}</AppText>
        </View>
      ) : null}

      <View style={styles.scale}>
        <View style={styles.track} />
        <View style={[styles.band, { left: `${percent(BAND_LOW)}%`, right: `${100 - percent(BAND_HIGH)}%` }]} />
        <View style={[styles.marker, { left: `${percent(ratio)}%` }]} />
      </View>
      <View style={styles.labels}>
        <AppText variant="caption" tone="tertiary">← Altın ucuz</AppText>
        <AppText variant="caption" tone="tertiary">{`Ort. ${BAND_LOW}–${BAND_HIGH}`}</AppText>
        <AppText variant="caption" tone="tertiary">Gümüş ucuz →</AppText>
      </View>

      <AppText variant="body">{interpret(ratio)}</AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    gap: 12,
    padding: paddings.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  scale: { height: 16, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surface.muted },
  band: { position: 'absolute', height: 6, borderRadius: 3, backgroundColor: colors.brand.goldSoft },
  marker: {
    position: 'absolute',
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.surface.elevated,
    backgroundColor: colors.brand.goldDeep,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
}));
