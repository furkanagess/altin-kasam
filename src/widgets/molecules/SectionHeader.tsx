import { AppText } from '@/src/widgets/atoms/AppText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  title: string;
  /** Metin verilirse alt başlık stiliyle yazılır; bileşen olduğu gibi gösterilir. */
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  /** Başlığın yanında PRO işareti; bölüm Pro içerik barındırıyorsa. */
  pro?: boolean;
};

export function SectionHeader({ title, subtitle, right, pro }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <AppText variant="h2">{title}</AppText>
          {pro ? <ProMark /> : null}
        </View>
        {typeof subtitle === 'string' ? (
          <AppText variant="caption" tone="secondary">
            {subtitle}
          </AppText>
        ) : (
          subtitle ?? null
        )}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
