import { makeStyles, radii } from '@/src/core/theme';
import React from 'react';
import { Text, View } from 'react-native';

/** Pro gerektiren seçeneklerin yanında gösterilen küçük işaret. */
export function ProMark() {
  const styles = useStyles();
  return (
    <View style={styles.mark} pointerEvents="none">
      <Text style={styles.text}>PRO</Text>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  mark: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.brand.gold,
  },
  text: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: colors.text.onGold,
  },
}));
