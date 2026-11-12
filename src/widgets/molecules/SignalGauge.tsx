import { STRONG_SIGNAL_THRESHOLD, SENTIMENT_THRESHOLD } from '@/src/core/constants/insights';
import { useTheme, type AppColors } from '@/src/core/theme';
import type { TradeSignal } from '@/src/domain/models';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

/** Güç ibrenin konumundan okunur; etiket yalnızca yönü söyler. */
export function signalMeta(colors: AppColors): Record<TradeSignal, { label: string; color: string }> {
  return {
    strongSell: { label: 'Düşüş yönlü', color: colors.signal.strongDown },
    sell: { label: 'Düşüş yönlü', color: colors.semantic.down },
    hold: { label: 'Yatay', color: colors.text.secondary },
    buy: { label: 'Yükseliş yönlü', color: colors.semantic.up },
    strongBuy: { label: 'Yükseliş yönlü', color: colors.signal.strongUp },
    none: { label: 'Veri az', color: colors.text.tertiary },
  };
}

const SEGMENTS: { signal: TradeSignal; from: number; to: number }[] = [
  { signal: 'strongSell', from: -1, to: -STRONG_SIGNAL_THRESHOLD },
  { signal: 'sell', from: -STRONG_SIGNAL_THRESHOLD, to: -SENTIMENT_THRESHOLD },
  { signal: 'hold', from: -SENTIMENT_THRESHOLD, to: SENTIMENT_THRESHOLD },
  { signal: 'buy', from: SENTIMENT_THRESHOLD, to: STRONG_SIGNAL_THRESHOLD },
  { signal: 'strongBuy', from: STRONG_SIGNAL_THRESHOLD, to: 1 },
];

function segmentColor(signal: TradeSignal, colors: AppColors): string {
  if (signal === 'strongSell') return colors.signal.strongDown;
  if (signal === 'sell') return colors.signal.down;
  if (signal === 'buy') return colors.signal.up;
  if (signal === 'strongBuy') return colors.signal.strongUp;
  return colors.border.strong;
}

const GAP = 0.06;

/** Skor bölgeleri eşit açılara yayılır; ibre bulunduğu bölge içinde orantılı ilerler. */
function angleOf(score: number): number {
  const clamped = Math.max(-1, Math.min(1, score));
  const index = Math.max(0, SEGMENTS.findIndex((s) => clamped <= s.to));
  const segment = SEGMENTS[index];
  const t = (clamped - segment.from) / (segment.to - segment.from);
  const span = Math.PI / SEGMENTS.length;
  return Math.PI - (index + t) * span;
}

type Props = {
  signal: TradeSignal;
  score: number;
  /** Gösterge genişliği; yükseklik yarısı kadardır. */
  size?: number;
  /** `false` ise etiket çizilmez (yanında ayrıca gösterilen küçük kullanım). */
  showLabel?: boolean;
};

export function SignalGauge({ signal, score, size = 120, showLabel = true }: Props) {
  const { colors } = useTheme();
  const stroke = Math.max(4, Math.round(size / 15));
  const radius = size / 2 - stroke / 2;
  const cx = size / 2;
  const cy = size / 2;
  const point = (angle: number, r = radius) => ({
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  });
  const span = Math.PI / SEGMENTS.length;
  const active = signal !== 'none';
  const needle = point(angleOf(score), radius - stroke - size / 30);
  const hub = Math.max(2.5, size / 30);
  const meta = signalMeta(colors)[signal];

  return (
    <View style={styles.wrap} accessibilityLabel={`Beklenti: ${meta.label}`}>
      <Svg width={size} height={size / 2 + hub}>
        {SEGMENTS.map((segment, i) => {
          const start = point(Math.PI - i * span - GAP / 2);
          const end = point(Math.PI - (i + 1) * span + GAP / 2);
          return (
            <Path
              key={segment.signal}
              d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`}
              stroke={segmentColor(segment.signal, colors)}
              strokeOpacity={active ? (segment.signal === signal ? 1 : 0.35) : 0.25}
              strokeWidth={stroke}
              strokeLinecap="butt"
              fill="none"
            />
          );
        })}
        {active ? (
          <>
            <Line
              x1={cx}
              y1={cy}
              x2={needle.x}
              y2={needle.y}
              stroke={colors.brand.ink}
              strokeWidth={Math.max(1.5, size / 50)}
              strokeLinecap="round"
            />
            <Circle cx={cx} cy={cy} r={hub} fill={colors.brand.ink} />
          </>
        ) : null}
      </Svg>
      {showLabel ? (
        <AppText variant="bodyStrong" style={{ color: meta.color }}>
          {meta.label}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
});
