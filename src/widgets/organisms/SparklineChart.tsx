import { colors, paddings, radii } from '@/src/core/theme';
import type { CandlePoint } from '@/src/domain/models';
import { formatTRY } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

type Props = {
  points: CandlePoint[];
  height?: number;
  label?: string;
};

export function SparklineChart({ points, height = 160, label }: Props) {
  const width = 320;
  const path = useMemo(() => {
    if (!points.length) return '';
    const values = points.map((p) => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    return points
      .map((p, i) => {
        const x = (i / Math.max(points.length - 1, 1)) * (width - 8) + 4;
        const y = height - 12 - ((p.v - min) / span) * (height - 28);
        return `${x},${y}`;
      })
      .join(' ');
  }, [points, height]);

  const last = points[points.length - 1];
  const first = points[0];
  const up = last && first ? last.v >= first.v : true;

  return (
    <View style={styles.wrap}>
      {label ? (
        <View style={styles.header}>
          <AppText variant="caption" tone="secondary">
            {label}
          </AppText>
          {last ? (
            <AppText variant="bodyStrong" tone={up ? 'up' : 'down'}>
              {formatTRY(last.v)}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {points.length ? (
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          <Polyline
            points={path}
            fill="none"
            stroke={up ? colors.brand.gold : colors.semantic.down}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {path ? (
            <Circle
              cx={Number(path.split(' ').at(-1)?.split(',')[0] ?? 0)}
              cy={Number(path.split(' ').at(-1)?.split(',')[1] ?? 0)}
              r={4}
              fill={up ? colors.brand.gold : colors.semantic.down}
            />
          ) : null}
        </Svg>
      ) : (
        <AppText tone="tertiary">Grafik verisi yok</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: paddings.md,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
