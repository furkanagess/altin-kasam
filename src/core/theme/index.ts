import { colors } from './colors';
import { paddings } from './paddings';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export const theme = {
  colors,
  paddings,
  spacing,
  typography,
  radii,
} as const;

export type AppTheme = typeof theme;

export { colors, paddings, radii, spacing, typography };
