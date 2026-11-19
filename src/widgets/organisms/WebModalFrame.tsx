import { makeStyles, paddings, radii, useTheme } from '@/src/core/theme';
import { webLayout } from '@/src/core/theme/web';
import { AppText } from '@/src/widgets/atoms/AppText';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  title?: string;
  size?: keyof typeof webLayout.dialog;
  children: React.ReactNode;
};

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Geniş web ekranında modal rotaları (varlık ekle, alarm, hedef) ortalanmış pencere olarak
 * çizer. Rota `transparentModal` açılır; arkadaki sayfa karartmanın altında görünür kalır.
 * Dış tıklama ve `Esc` pencereyi kapatır.
 */
export function WebModalFrame({ title, size = 'sm', children }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <View style={styles.root}>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Kapat" />
      <View style={[styles.card, { maxWidth: webLayout.dialog[size] }]} accessibilityRole={'dialog' as never}>
        <View style={styles.header}>
          <AppText variant="h3" style={styles.title} numberOfLines={1}>
            {title}
          </AppText>
          <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Kapat">
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M6 6l12 12M18 6 6 18" stroke={colors.text.secondary} strokeWidth={2.6} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: paddings.xl },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.surface.overlay },
  card: {
    width: '100%',
    height: '88%',
    maxHeight: 820,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.surface.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.subtle,
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.32)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: paddings.sm,
    paddingHorizontal: paddings.screen,
    paddingVertical: paddings.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  title: { flex: 1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.muted,
  },
  body: { flex: 1 },
}));
