import { makeStyles, paddings } from '@/src/core/theme';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React from 'react';
import { View } from 'react-native';

type Props = {
  onAdd: () => void;
};

/** Kasa boşken kutusuz, ortalanmış karşılama: kullanıcıyı ilk varlığını eklemeye yönlendirir. */
export function VaultEmptyState({ onAdd }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      <View style={styles.mark}>
        <AppText variant="h2" style={styles.markGlyph}>
          ₺
        </AppText>
      </View>
      <AppText variant="h2" style={styles.center}>
        Kasana hoş geldin
      </AppText>
      <AppText variant="body" tone="secondary" style={styles.center}>
        Altın, gümüş ya da nakdini ekle; toplam değerini, kâr ve zararını tek yerden takip et.
      </AppText>
      <AppButton label="İlk varlığını ekle" onPress={onAdd} style={styles.button} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: paddings.xl,
    paddingHorizontal: paddings.md,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.goldTint,
    marginBottom: 4,
  },
  markGlyph: { color: colors.brand.gold },
  center: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 8 },
}));
