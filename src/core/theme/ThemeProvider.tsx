import { storageGet, storageSet } from '@/src/core/storage/storage';
import { darkColors, lightColors, type AppColors } from '@/src/core/theme/colors';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Appearance,
  Platform,
  StyleSheet,
  useColorScheme,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type NamedStyles = { readonly [key: string]: ViewStyle | TextStyle | ImageStyle };

export type ThemePreference = 'system' | 'light' | 'dark';
export type ColorScheme = 'light' | 'dark';

/** Uygulama içi yazı boyutu tercihi; cihazın yazı tipi ayarına ek olarak çarpılır. */
export type FontScale = 'small' | 'default' | 'large' | 'xlarge';
export const FONT_SCALES: readonly { id: FontScale; label: string; factor: number }[] = [
  { id: 'small', label: 'Küçük', factor: 0.9 },
  { id: 'default', label: 'Normal', factor: 1 },
  { id: 'large', label: 'Büyük', factor: 1.15 },
  { id: 'xlarge', label: 'Çok büyük', factor: 1.3 },
];

const PREFERENCE_KEY = 'altin_kasam_theme_v1';
const FONT_SCALE_KEY = 'altin_kasam_font_scale_v1';
const PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark'];

type ThemeContextValue = {
  colors: AppColors;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  fontScale: FontScale;
  /** `fontScale`'in çarpanı (0.9–1.3). */
  fontFactor: number;
  setFontScale: (scale: FontScale) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Tercih native tarafa da iletilir; böylece klavye, uyarılar ve sistem çubukları da aynı
 * temayı kullanır. "Sistem" seçiliyken cihaz ayarı değişince uygulama da değişir.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [fontScale, setFontScaleState] = useState<FontScale>('default');
  const system = useColorScheme();

  useEffect(() => {
    storageGet<ThemePreference>(PREFERENCE_KEY)
      .then((saved) => {
        if (saved && PREFERENCES.includes(saved)) setPreferenceState(saved);
      })
      .catch(() => {
        // Kayıt okunamazsa sistem teması kullanılır.
      });
  }, []);

  useEffect(() => {
    storageGet<FontScale>(FONT_SCALE_KEY)
      .then((saved) => {
        if (saved && FONT_SCALES.some((f) => f.id === saved)) setFontScaleState(saved);
      })
      .catch(() => {
        // Kayıt okunamazsa normal boyut kullanılır.
      });
  }, []);

  useEffect(() => {
    // react-native-web bu API'yi sağlamaz; web'de tema yalnızca stil tarafında uygulanır.
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void storageSet(PREFERENCE_KEY, next);
  }, []);

  const setFontScale = useCallback((next: FontScale) => {
    setFontScaleState(next);
    void storageSet(FONT_SCALE_KEY, next);
  }, []);

  const fontFactor = FONT_SCALES.find((f) => f.id === fontScale)?.factor ?? 1;

  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      preference,
      setPreference,
      fontScale,
      fontFactor,
      setFontScale,
    }),
    [scheme, preference, setPreference, fontScale, fontFactor, setFontScale],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı');
  return ctx;
}

/**
 * Temaya bağlı stil sayfası. Her palet için bir kez oluşturulur; tema değişince
 * bileşenler yeni sayfayla yeniden çizilir.
 */
export function makeStyles<S extends NamedStyles>(
  // `& NamedStyles` dönen nesneye bağlam tipi verir; 'row' gibi değerler string'e genişlemez.
  factory: (colors: AppColors) => S & NamedStyles,
): () => Readonly<S> {
  const cache = new Map<AppColors, Readonly<S>>();
  return function useStyles() {
    const { colors } = useTheme();
    const cached = cache.get(colors);
    if (cached) return cached;
    const styles = StyleSheet.create(factory(colors));
    cache.set(colors, styles);
    return styles;
  };
}
