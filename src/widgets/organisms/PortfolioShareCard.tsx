import { APP_NAME } from '@/src/core/constants/app';
import { formatAssetQuantity } from '@/src/core/constants/portfolioAssets';
import { darkColors } from '@/src/core/theme';
import type { PortfolioBreakdown, PortfolioSnapshot } from '@/src/domain/models';
import { formatMoney, formatPercent, formatSignedMoney } from '@/src/utils/format';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export const PORTFOLIO_GROUP_COLORS: Record<string, string> = {
  gram: '#E3B23C',
  ziynet: '#B8893B',
  bilezik: '#7A5A22',
  metal: '#9AA4B2',
  cash: '#3D8B6E',
};

const MAX_POSITIONS = 5;
/**
 * Görselin altındaki indirme adresi: landing sayfası iki mağazaya da yönlendirir. Her paylaşım
 * yeni kullanıcı getirebilsin diye her zaman gösterilir.
 */
const STORE_URL = process.env.EXPO_PUBLIC_STORE_URL || 'altin-kasam.web.app';
const APP_ICON = require('@/assets/images/icon.png');
/** Görsel her temada aynı çıksın diye koyu palet sabit kullanılır (useTheme yok). */
const c = darkColors;
const GOLD = c.brand.gold;
const BACKGROUND = '#12151B';
const RULE = 'rgba(212, 166, 79, 0.3)';
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

type Props = {
  snapshot: PortfolioSnapshot;
  breakdown: PortfolioBreakdown;
  /** Kapalıyken kasa değeri ve kâr/zarar tutarı yok, yüzdeler ve miktarlar var. */
  showAmounts: boolean;
};

const tone = (value: number) => (value >= 0 ? c.signal.up : c.signal.down);

/** Uygulama ikonu: sol üstteki marka işareti. */
function AppIconMark() {
  return <Image source={APP_ICON} style={styles.icon} accessibilityIgnoresInvertColors />;
}

/**
 * Paylaşılacak görsel: düz koyu zemin, altın vurgular ve tek ince altın çerçeve. Degrade,
 * iç içe kutu (container) ve kutucuk kullanılmaz; yalnızca dış çerçevenin köşeleri yuvarlaktır.
 */
export function PortfolioShareCard({ snapshot, breakdown, showAmounts }: Props) {
  // Görsel açıldığı andaki tarih; render'da Date.now çağrılmaz.
  const [today] = useState(() => dateFormatter.format(new Date()));
  const positions = snapshot.positions.slice(0, MAX_POSITIONS);
  const hidden = snapshot.positions.length - positions.length;
  return (
    <View style={styles.sheet} collapsable={false}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <AppIconMark />
          <Text style={styles.brand}>{APP_NAME}</Text>
        </View>
        <Text style={styles.date}>{today}</Text>
      </View>

      <Text style={styles.label}>TOPLAM GETİRİ</Text>
      <Text style={[styles.big, { color: tone(snapshot.pnlPercent) }]}>{formatPercent(snapshot.pnlPercent)}</Text>
      {showAmounts ? (
        <Text style={[styles.sub, { color: tone(snapshot.pnl) }]}>
          {formatSignedMoney(snapshot.pnl, snapshot.currency)}
        </Text>
      ) : null}

      <View style={styles.facts}>
        <Text style={styles.fact}>
          Bugün{'  '}
          <Text style={[styles.factValue, { color: tone(snapshot.dayPnlPercent) }]}>
            {formatPercent(snapshot.dayPnlPercent)}
          </Text>
        </Text>
        {showAmounts ? (
          <Text style={styles.fact}>
            Kasa değeri{'  '}
            <Text style={styles.factValue}>{formatMoney(snapshot.totalValue, snapshot.currency)}</Text>
          </Text>
        ) : null}
      </View>

      <View style={styles.divider} />

      <Text style={styles.section}>DAĞILIM</Text>
      <View style={styles.bar}>
        {breakdown.groups.map((g) => (
          <View key={g.id} style={{ flex: g.share, backgroundColor: PORTFOLIO_GROUP_COLORS[g.id] }} />
        ))}
      </View>
      <View style={styles.legend}>
        {breakdown.groups.map((g) => (
          <View key={g.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: PORTFOLIO_GROUP_COLORS[g.id] }]} />
            <Text style={styles.legendText}>
              {g.label} %{Math.round(g.share * 100)}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <Text style={styles.section}>VARLIKLAR</Text>
      {positions.map((p) => (
        <View key={p.assetId} style={styles.positionRow}>
          <Text style={styles.positionName} numberOfLines={1}>
            {p.label}
            <Text style={styles.positionQty}>{`  ${formatAssetQuantity(p.assetId, p.quantity)}`}</Text>
          </Text>
          <Text style={[styles.positionPct, { color: tone(p.pnlPercent) }]}>{formatPercent(p.pnlPercent)}</Text>
        </View>
      ))}
      {hidden > 0 ? <Text style={styles.more}>+{hidden} varlık daha</Text> : null}

      <View style={styles.footer}>
        <Text style={styles.footerLead}>{`${APP_NAME} ile takip ediyorum`}</Text>
        <Text style={styles.footerUrl}>{STORE_URL}</Text>
      </View>
      <Text style={styles.disclaimer}>Yatırım tavsiyesi değildir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tek ince altın çerçeve; yalnızca dış köşeler yuvarlak.
  sheet: { width: 360, padding: 22, gap: 4, backgroundColor: BACKGROUND, borderWidth: 2, borderColor: GOLD, borderRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 34, height: 34, borderRadius: 8 },
  brand: { fontSize: 17, fontWeight: '800', color: c.brand.goldDeep, letterSpacing: 0.3 },
  date: { fontSize: 12, color: c.text.tertiary },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: c.text.secondary },
  big: { fontSize: 52, fontWeight: '800', letterSpacing: -1.5, lineHeight: 60 },
  sub: { fontSize: 18, fontWeight: '700' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 2, marginTop: 8 },
  fact: { fontSize: 13, color: c.text.secondary },
  factValue: { fontSize: 15, fontWeight: '800', color: c.text.primary },
  divider: { height: 1, backgroundColor: RULE, marginVertical: 16 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: GOLD, marginBottom: 8 },
  bar: { flexDirection: 'row', height: 10, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8 },
  legendText: { fontSize: 12, color: c.text.primary },
  positionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  positionName: { flex: 1, fontSize: 14, fontWeight: '600', color: c.text.primary },
  positionQty: { fontSize: 12, fontWeight: '400', color: c.text.secondary },
  positionPct: { fontSize: 14, fontWeight: '800' },
  more: { fontSize: 12, color: c.text.tertiary, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: RULE, gap: 2 },
  footerLead: { fontSize: 11, color: c.text.secondary },
  footerUrl: { fontSize: 15, fontWeight: '800', color: GOLD, letterSpacing: 0.3 },
  disclaimer: { fontSize: 10, fontStyle: 'italic', color: c.text.tertiary, textAlign: 'center', marginTop: 10 },
});
