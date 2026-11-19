import type { InfoContent } from '@/src/core/constants/marketInfo';
import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { useSheetPresentation } from '@/src/core/theme/web';
import { AppButton } from '@/src/widgets/atoms/AppButton';
import { AppText } from '@/src/widgets/atoms/AppText';
import React, { useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

type Props = InfoContent & {
  visible: boolean;
  onClose: () => void;
  /** Girişin altında, maddelerden önce gösterilir (ör. güncel değerin ölçeği ve yorumu). */
  children?: ReactNode;
};

const SHEET_OFFSET = 600;
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

function CloseIcon() {
  const { colors } = useTheme();
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6 6 18" stroke={colors.text.secondary} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Alttan açılan açıklama paneli; uzun içerikte kendi içinde kayar. */
export function InfoSheet({ visible, onClose, title, intro, items, note, children }: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const sheet = useSheetPresentation();
  const [offset] = useState(() => new Animated.Value(SHEET_OFFSET));

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
      <View style={[styles.root, sheet.rootStyle]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: paddings.md + insets.bottom, transform: sheet.wide ? [] : [{ translateY: offset }] },
            sheet.sheetStyle,
          ]}
        >
          {sheet.wide ? null : <View style={styles.handle} />}
          <View style={styles.header}>
            <AppText variant="h3" style={styles.title}>
              {title}
            </AppText>
            <Pressable onPress={onClose} style={styles.close} hitSlop={8} accessibilityRole="button" accessibilityLabel="Kapat">
              <CloseIcon />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <AppText variant="body" tone="secondary">
              {intro}
            </AppText>
            {children}
            {items.map((item) => (
              <View key={item.title} style={styles.item}>
                <View style={styles.bullet} />
                <View style={styles.itemText}>
                  <AppText variant="bodyStrong">{item.title}</AppText>
                  <AppText variant="body" tone="secondary">
                    {item.body}
                  </AppText>
                </View>
              </View>
            ))}
            {note ? (
              <AppText variant="caption" tone="tertiary" style={styles.note}>
                {note}
              </AppText>
            ) : null}
          </ScrollView>

          <AppButton label="Anladım" onPress={onClose} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface.overlay },
  sheet: {
    maxHeight: '85%',
    gap: paddings.md,
    paddingHorizontal: paddings.screen,
    paddingTop: paddings.xs,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surface.canvas,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border.strong },
  header: { flexDirection: 'row', alignItems: 'center', gap: paddings.sm, marginTop: -paddings.xs },
  title: { flex: 1 },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  scroll: { flexGrow: 0 },
  content: { gap: paddings.md, paddingBottom: paddings.xs },
  item: { flexDirection: 'row', gap: paddings.sm },
  bullet: { width: 8, height: 8, marginTop: 7, borderRadius: 4, backgroundColor: colors.brand.gold },
  itemText: { flex: 1, gap: 2 },
  note: { fontStyle: 'italic' },
}));
