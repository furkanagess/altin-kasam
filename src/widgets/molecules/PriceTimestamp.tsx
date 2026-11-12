import { makeStyles, useTheme } from '@/src/core/theme';
import { formatClockTime } from '@/src/utils/format';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { AppText } from '@/src/widgets/atoms/AppText';
import { ClockIcon } from '@/src/widgets/atoms/ClockIcon';
import React from 'react';
import { View } from 'react-native';

type Props = {
  /** Verilmezse son piyasa verisinin geliş zamanı kullanılır. */
  timestamp?: number;
};

/** Fiyat bilgisinin son geliş saati: saat ikonu + "16:45:22". Veri yoksa hiçbir şey çizmez. */
export function PriceTimestamp({ timestamp }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { snapshot } = useMarketViewModel();
  const at = timestamp ?? snapshot?.updatedAt;
  if (!at) return null;
  const text = formatClockTime(at);
  return (
    <View style={styles.row} accessible accessibilityLabel={`Fiyat son ${text} saatinde geldi`}>
      <ClockIcon color={colors.text.tertiary} />
      <AppText variant="caption" tone="tertiary" style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontVariant: ['tabular-nums'] },
}));
