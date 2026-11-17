import { CHART_UNITS, type ChartUnit } from '@/src/core/constants/app';
import { makeStyles, radii } from '@/src/core/theme';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { memo, startTransition, useOptimistic } from 'react';
import { Pressable, View } from 'react-native';

const LABELS: Record<ChartUnit, string> = { gram: 'Gram', ounce: 'Ons' };
const A11Y: Record<ChartUnit, string> = { gram: 'Gram fiyatı', ounce: 'Ons fiyatı' };

type Props = {
  value: ChartUnit;
  onChange: (unit: ChartUnit) => void;
};

/** Gram (kuyumcu, TL/g) ve ons (uluslararası spot) arasında geçiş; para birimi seçiciyle aynı görünüm. */
function UnitSwitcherBase({ value, onChange }: Props) {
  const styles = useStyles();
  // Seçim anında görünür; grafiklerin ağır yeniden çizimi geçiş (transition) olarak arka planda
  // yapılır, dokunuş takılmaz. Geçiş bitince gerçek değere döner.
  const [shown, setShown] = useOptimistic(value);
  const select = (unit: ChartUnit) => {
    startTransition(() => {
      setShown(unit);
      onChange(unit);
    });
  };
  return (
    <View style={styles.track} role="radiogroup" aria-label="Fiyat birimi">
      {CHART_UNITS.map((unit) => {
        const selected = unit === shown;
        return (
          <Pressable
            key={unit}
            onPress={() => {
              if (!selected) select(unit);
            }}
            style={[styles.option, selected && styles.selected]}
            role="radio"
            aria-checked={selected}
            aria-label={A11Y[unit]}
            hitSlop={4}
          >
            <AppText variant="caption" tone={selected ? 'primary' : 'secondary'} style={selected && styles.selectedText}>
              {LABELS[unit]}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const UnitSwitcher = memo(UnitSwitcherBase);

const useStyles = makeStyles((colors) => ({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.muted,
  },
  option: { minWidth: 52, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.pill },
  selected: {
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  selectedText: { fontWeight: '700' },
}));
