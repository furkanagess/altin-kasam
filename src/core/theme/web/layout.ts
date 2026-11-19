/**
 * Web düzen token'ları. Renk, yarıçap ve boşluklar ortak temadan gelir; burada yalnızca geniş
 * ekranın gerektirdiği ölçüler vardır. Native'de kullanılmazlar (`useBreakpoint` hep `compact`).
 */

export type Breakpoint = 'compact' | 'medium' | 'expanded';

/** Alt sınırlar (px): `compact` < 768 ≤ `medium` < 1200 ≤ `expanded`. */
export const breakpoints = {
  medium: 768,
  expanded: 1200,
} as const;

export const webLayout = {
  /** Sayfa içerik kabının en geniş hâli. */
  maxContent: 1200,
  /** Uzun metin, form ve ayar sayfaları için okunabilir genişlik. */
  readable: 720,
  dialog: { sm: 560, lg: 720 },
  /** Sayfa kenar boşluğu; `compact`'ta mobil `paddings.screen` geçerlidir. */
  gutter: { medium: 24, expanded: 32 },
  sidebar: { collapsed: 72, expanded: 248 },
} as const;

/** `expanded`'da mobil tipografinin üstüne yazılan büyüklükler. */
export const webTypography = {
  h1: { fontSize: 32, lineHeight: 40 },
  h2: { fontSize: 22, lineHeight: 28 },
  price: { fontSize: 28, lineHeight: 34 },
} as const;

export function breakpointFor(width: number): Breakpoint {
  if (width >= breakpoints.expanded) return 'expanded';
  if (width >= breakpoints.medium) return 'medium';
  return 'compact';
}
