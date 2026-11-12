import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import type { GoalPeriod, InvestmentGoal } from '@/src/domain/models';
import { formatDecimalInput, formatGrams, formatMoney, numberToInput, parseGramsTr } from '@/src/utils/format';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

const MIN_GRAMS = 0.1;

/** Giriş alanı için binlik ayırıcısız ("1.000" gram ayrıştırıcıda 1 okunurdu). */
const toInputText = (value: number) => numberToInput(value);

const PERIODS: { id: GoalPeriod; label: string; unit: string }[] = [
  { id: 'monthly', label: 'Aylık', unit: 'ay' },
  { id: 'yearly', label: 'Yıllık', unit: 'yıl' },
];

const QUICK_GRAMS: Record<GoalPeriod, number[]> = {
  monthly: [1, 2, 5, 10],
  yearly: [12, 25, 50, 100],
};

type Props = {
  initial?: InvestmentGoal | null;
  /** Gram altın satış fiyatı (TRY); verilirse hedefin bugünkü TL karşılığı gösterilir. */
  gramPrice?: number;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (goal: { period: GoalPeriod; grams: number }) => void;
};

export function GoalForm({ initial, gramPrice, submitLabel, submitting, onSubmit }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<GoalPeriod>(initial?.period ?? 'monthly');
  const [text, setText] = useState(initial ? toInputText(initial.grams) : '');
  const grams = parseGramsTr(text);
  const valid = Number.isFinite(grams) && grams >= MIN_GRAMS;
  const unit = PERIODS.find((p) => p.id === period)?.unit ?? 'ay';

  const hint = (() => {
    if (!text) return 'Bir miktar gir veya önerilerden birini seç.';
    if (!valid) return `Geçerli bir miktar gir (en az ${formatGrams(MIN_GRAMS)}).`;
    const other =
      period === 'monthly'
        ? `Yılda ${formatGrams(grams * 12)}`
        : `Ayda ortalama ${formatGrams(grams / 12)}`;
    const cost = gramPrice ? ` · bugünkü fiyatla ≈ ${formatMoney(grams * gramPrice, 'TRY')} / ${unit}` : '';
    return `${other}${cost}`;
  })();

  return (
    <View style={styles.wrap}>
      <AppText variant="h3">Ne sıklıkla biriktirmek istersin?</AppText>
      <View style={styles.segment} role="radiogroup" aria-label="Hedef dönemi">
        {PERIODS.map((p) => {
          const selected = p.id === period;
          return (
            <Pressable
              key={p.id}
              onPress={() => setPeriod(p.id)}
              style={[styles.segmentOption, selected && styles.segmentSelected]}
              role="radio"
              aria-checked={selected}
            >
              <AppText variant="bodyStrong" tone={selected ? 'primary' : 'secondary'}>
                {p.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="h3">Hedef altın (gram / {unit})</AppText>
      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={(t) => setText(formatDecimalInput(t, text))}
          keyboardType="decimal-pad"
          placeholder={`Ör. ${toInputText(QUICK_GRAMS[period][1])}`}
          placeholderTextColor={colors.text.tertiary}
          style={styles.input}
          accessibilityLabel="Hedef gram"
        />
        <AppText variant="h2" tone="secondary">g</AppText>
      </View>
      <View style={styles.chips}>
        {QUICK_GRAMS[period].map((value) => {
          const selected = valid && grams === value;
          return (
            <Pressable
              key={value}
              onPress={() => setText(toInputText(value))}
              style={[styles.chip, selected && styles.chipSelected]}
              accessibilityRole="button"
            >
              <AppText
                variant="caption"
                style={{ color: selected ? colors.text.onGold : colors.brand.goldDeep }}
              >
                {formatGrams(value)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <AppText variant="caption" tone={text && !valid ? 'down' : 'secondary'}>
        {hint}
      </AppText>
      <AppText variant="caption" tone="tertiary">
        24 ayar gram altın karşılığı sayılır: çeyrek ≈ 1,61 g, 10 gr 22 ayar bilezik ≈ 9,21 g.
      </AppText>

      <AppButton
        label={submitLabel}
        loading={submitting}
        disabled={!valid || submitting}
        onPress={() => onSubmit({ period, grams })}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { gap: 12 },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: colors.surface.muted,
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: paddings.sm,
    borderRadius: radii.sm,
  },
  segmentSelected: {
    backgroundColor: colors.surface.elevated,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.elevated,
    borderRadius: radii.md,
    paddingHorizontal: paddings.md,
    paddingVertical: paddings.sm,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: paddings.sm,
    paddingVertical: paddings.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand.goldSoft,
    backgroundColor: colors.surface.elevated,
  },
  chipSelected: {
    backgroundColor: colors.brand.gold,
    borderColor: colors.brand.gold,
  },
}));
