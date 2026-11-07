export const paddings = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  screen: 20,
  card: 16,
} as const;

export type AppPaddings = typeof paddings;
