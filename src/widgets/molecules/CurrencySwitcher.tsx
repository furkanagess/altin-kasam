import { CURRENCY_LABELS, CURRENCY_SYMBOLS, type Currency } from '@/src/core/constants/app';
import { makeStyles, radii } from '@/src/core/theme';
import type { FxRates } from '@/src/domain/models';
import { formatMoney } from '@/src/utils/format';
import { AppText } from '@/src/widgets/atoms/AppText';
import { ProMark } from '@/src/widgets/atoms/ProMark';
import React, { memo, useEffect, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';

const OPTION_WIDTH = 64;
const COMPACT_OPTION_WIDTH = 28;
const PADDING = 3;
const COMPACT_PADDING = 2;

type Props = {
  value: Currency;
  options: readonly Currency[];
  onChange: (currency: Currency) => void;
  /** 1 birimin TRY karşılığı; kuru olmayan seçenekler pasif görünür. */
  fxRates: FxRates;
  /** Pro gerektiren seçenekler; dokununca `onLocked` çağrılır. */
  lockedOptions?: readonly Currency[];
  onLocked?: (currency: Currency) => void;
  /** Kart başlığı gibi dar alanlar için: yalnızca simgeler, kur satırı yok. */
  compact?: boolean;
};

function rateCaption(value: Currency, fxRates: FxRates): string {
  const parts = (['USD', 'EUR'] as const)
    .filter((c) => (value === 'TRY' || value === c) && fxRates[c])
    .map((c) => `1 ${CURRENCY_SYMBOLS[c]} = ${formatMoney(fxRates[c]!, 'TRY')}`);
  return parts.length ? parts.join(' · ') : 'Kurlar yükleniyor…';
}

const NONE: readonly Currency[] = [];

function CurrencySwitcherBase({
  value,
  options,
  onChange,
  fxRates,
  lockedOptions = NONE,
  onLocked,
  compact = false,
}: Props) {
  const styles = useStyles();
  const optionWidth = compact ? COMPACT_OPTION_WIDTH : OPTION_WIDTH;
  const selectedIndex = Math.max(0, options.indexOf(value));
  const [position] = useState(() => new Animated.Value(selectedIndex));

  useEffect(() => {
    Animated.spring(position, {
      toValue: selectedIndex,
      useNativeDriver: Platform.OS !== 'web',
      speed: 24,
      bounciness: 4,
    }).start();
  }, [position, selectedIndex]);

  return (
    <View style={styles.row}>
      <View style={[styles.track, compact && styles.trackCompact]} role="radiogroup" aria-label="Para birimi">
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            compact && styles.thumbCompact,
            { width: optionWidth, transform: [{ translateX: Animated.multiply(position, optionWidth) }] },
          ]}
        />
        {options.map((currency) => {
          const selected = currency === value;
          const locked = lockedOptions.includes(currency);
          const available = locked || currency === 'TRY' || !!fxRates[currency];
          return (
            <Pressable
              key={currency}
              onPress={() => {
                if (locked) onLocked?.(currency);
                else if (available && !selected) onChange(currency);
              }}
              disabled={!available}
              style={[styles.option, compact && styles.optionCompact, { width: optionWidth }, !available && styles.unavailable]}
              role="radio"
              aria-checked={selected}
              aria-disabled={!available}
              aria-label={`${CURRENCY_LABELS[currency]}${locked ? ', Pro' : ''}`}
              hitSlop={4}
            >
              <AppText
                variant="caption"
                tone={selected ? 'primary' : locked ? 'tertiary' : 'secondary'}
                style={selected && styles.selectedText}
              >
                {compact ? CURRENCY_SYMBOLS[currency] : CURRENCY_LABELS[currency]}
              </AppText>
              {locked ? (
                <View style={[styles.proMark, compact && styles.proMarkCompact]}>
                  <ProMark />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {compact ? null : (
        <AppText variant="caption" tone="tertiary">
          {rateCaption(value, fxRates)}
        </AppText>
      )}
    </View>
  );
}

/** Ebeveyn saniyelik fiyat tikleriyle yeniden çizilirken seçici etkilenmez. */
export const CurrencySwitcher = memo(CurrencySwitcherBase);

const useStyles = makeStyles((colors) => ({
  row: {
    gap: 6,
  },
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: PADDING,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.muted,
  },
  thumb: {
    position: 'absolute',
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  option: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  optionCompact: { paddingVertical: 3 },
  trackCompact: { padding: COMPACT_PADDING },
  thumbCompact: { top: COMPACT_PADDING, bottom: COMPACT_PADDING, left: COMPACT_PADDING },
  unavailable: {
    opacity: 0.4,
  },
  selectedText: {
    fontWeight: '700',
  },
  proMark: {
    position: 'absolute',
    top: -4,
    right: 2,
  },
  proMarkCompact: { top: -8, right: -6 },
}));
