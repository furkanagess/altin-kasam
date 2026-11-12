import { makeStyles, radii, useTheme } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Açıklanmış olay için analiz raporu hazır; rapor Pro içerik olduğundan PRO işaretiyle. */
export function ReportBadge() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.badge} accessibilityLabel="Analiz raporu hazır, Pro">
      <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 3h9l4 4v14H6zM9 12h7M9 16h5"
          stroke={colors.brand.goldDeep}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <AppText variant="caption" style={styles.text}>
        Analiz raporu
      </AppText>
      <ProMark />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.goldTint,
  },
  text: { fontSize: 11, fontWeight: '700', color: colors.brand.goldDeep },
}));
