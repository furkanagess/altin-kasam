import { makeStyles, radii } from '@/src/core/theme';
import { feedbackDatasource } from '@/src/data/datasources/feedbackDatasource';
import { AppText } from '@/src/widgets/atoms/AppText';
import { formatDecimalInput, numberToInput, parseDecimalTr } from '@/src/utils/format';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';

type Props = {
  /** Kullanıcının yazdığı metin; "1,5" gibi ondalıklar serbest. */
  value: string;
  onChange: (value: string) => void;
  /** "adet", "gram"; yalnızca ekran okuyucu etiketlerinde (soru başlığı birimi zaten söyler). */
  unit: string;
  step?: number;
};

function parse(value: string): number {
  const n = parseDecimalTr(value);
  return Number.isFinite(n) ? n : 0;
}

function format(value: number): string {
  return numberToInput(Math.round(value * 100) / 100);
}

export function QuantityStepper({ value, onChange, unit, step = 1 }: Props) {
  const styles = useStyles();
  const current = parse(value);
  const canDecrease = current - step > 0;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => {
          if (!canDecrease) return;
          feedbackDatasource.quantityDown();
          onChange(format(current - step));
        }}
        disabled={!canDecrease}
        style={[styles.button, !canDecrease && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={`${step} ${unit} azalt`}
        hitSlop={6}
      >
        <AppText variant="h2" tone="gold">−</AppText>
      </Pressable>
      <View style={styles.field}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(formatDecimalInput(t, value))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={styles.input}
          accessibilityLabel={`Miktar (${unit})`}
        />
      </View>
      <Pressable
        onPress={() => {
          feedbackDatasource.quantityUp();
          onChange(format(current + step));
        }}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={`${step} ${unit} artır`}
        hitSlop={6}
      >
        <AppText variant="h2" tone="gold">+</AppText>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
  },
  disabled: { opacity: 0.4 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
  },
  input: {
    // Sabit genişlik: içerik genişliğine göre ölçülen alan Android'de rakam artınca son hanesini kırpıyordu.
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
  },
}));
