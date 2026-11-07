export const typography = {
  brand: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
  },
  h1: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  h3: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  price: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  mono: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
} as const;

export type AppTypography = typeof typography;
