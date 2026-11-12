import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

export type FilterOption = {
  id: string;
  label: string;
  /** Bu seçenekle gösterilecek içerik sayısı. */
  count?: number;
};

export type FilterGroup = {
  title: string;
  /** Başlığın altında kısa açıklama (ör. neyin "okundu" sayıldığı). */
  hint?: string;
  options: readonly FilterOption[];
  value: string;
  onChange: (id: string) => void;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  groups: FilterGroup[];
  onReset: () => void;
  /** Seçili filtre sayısı; 0 ise "Temizle" pasiftir. */
  activeCount: number;
  /** Filtre sonrası içerik sayısı; alttaki düğmede. */
  resultCount: number;
};

const SHEET_OFFSET = 480;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function CloseIcon() {
  const { colors } = useTheme();
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6 6 18" stroke={colors.text.secondary} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * İçeriğe göre genişleyen seçenek; satıra sığmayanlar alt satıra geçer. Seçim yalnızca renkle
 * gösterilir: genişlik değişmez, seçim yapıldıkça seçenekler yer değiştirmez.
 */
function OptionChip({ option, selected, onPress }: { option: FilterOption; selected: boolean; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = selected ? colors.brand.goldDeep : colors.text.primary;
  const empty = option.count === 0 && !selected;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && !selected && styles.chipPressed,
        empty && styles.dim,
      ]}
      role="radio"
      aria-checked={selected}
      aria-label={option.count != null ? `${option.label}, ${option.count} içerik` : option.label}
      hitSlop={4}
    >
      <AppText variant="body" style={[styles.chipLabel, { color }]} numberOfLines={1}>
        {option.label}
      </AppText>
      {option.count != null ? (
        <View style={[styles.count, selected && styles.countSelected]}>
          <AppText variant="caption" style={[styles.countText, { color: selected ? colors.brand.goldDeep : colors.text.secondary }]}>
            {option.count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Alttan açılan filtre paneli; seçimler anında uygulanır. */
export function FilterSheet({ visible, onClose, groups, onReset, activeCount, resultCount }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [offset] = useState(() => new Animated.Value(SHEET_OFFSET));

  // Karartma Modal ile solarak gelir; panel ayrıca alttan kayar.
  useEffect(() => {
    if (!visible) return;
    offset.setValue(SHEET_OFFSET);
    Animated.spring(offset, {
      toValue: 0,
      useNativeDriver: USE_NATIVE_DRIVER,
      damping: 22,
      stiffness: 220,
      mass: 0.8,
    }).start();
  }, [visible, offset]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Filtreleri kapat" />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: paddings.md + insets.bottom, transform: [{ translateY: offset }] },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="h3">Filtrele</AppText>
              <AppText variant="caption" tone="tertiary">
                {activeCount ? `${activeCount} filtre seçili` : 'Tüm içerik gösteriliyor'}
              </AppText>
            </View>
            {activeCount ? (
              <Pressable
                onPress={onReset}
                hitSlop={8}
                style={styles.reset}
                accessibilityRole="button"
                accessibilityLabel="Filtreleri temizle"
              >
                <AppText variant="caption" tone="gold" style={styles.resetLabel}>
                  Temizle
                </AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={styles.close}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
            >
              <CloseIcon />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} bounces={false}>
            {groups.map((group, i) => (
              <View key={group.title} style={[styles.group, i > 0 && styles.groupDivider]}>
                <View style={styles.groupHeader}>
                  <AppText variant="bodyStrong">{group.title}</AppText>
                  {group.hint ? (
                    <AppText variant="caption" tone="tertiary">
                      {group.hint}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.chips} role="radiogroup" aria-label={group.title}>
                  {group.options.map((option) => (
                    <OptionChip
                      key={option.id}
                      option={option}
                      selected={group.value === option.id}
                      onPress={() => group.onChange(option.id)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <AppButton
            label={resultCount ? `${resultCount} içeriği göster` : 'Eşleşen içerik yok'}
            onPress={onClose}
            variant={resultCount ? 'primary' : 'secondary'}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface.overlay,
  },
  sheet: {
    maxHeight: '88%',
    gap: paddings.md,
    paddingHorizontal: paddings.screen,
    paddingTop: paddings.xs,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface.canvas,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border.strong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingBottom: paddings.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
  },
  headerText: { flex: 1, gap: 2 },
  reset: {
    paddingHorizontal: paddings.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface.goldTint,
  },
  resetLabel: { fontWeight: '700' },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  body: { flexGrow: 0 },
  bodyContent: { paddingBottom: paddings.xs },
  group: { gap: paddings.sm, paddingVertical: paddings.sm },
  groupDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  groupHeader: { gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: paddings.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.elevated,
  },
  chipSelected: { borderColor: colors.brand.gold, backgroundColor: colors.surface.goldTint },
  chipPressed: { backgroundColor: colors.surface.muted },
  chipLabel: { fontSize: 14, fontWeight: '600' },
  // İki basamağa yetecek sabit en: sayı 9'dan 12'ye çıkınca seçenek genişlemez.
  count: {
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
    alignItems: 'center',
    backgroundColor: colors.surface.muted,
  },
  countSelected: { backgroundColor: colors.brand.goldSoft },
  countText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dim: { opacity: 0.5 },
}));
