import { paddings } from './paddings';
import { radii } from './radii';
import { spacing } from './spacing';
import { typography } from './typography';

export type { AppColors } from './colors';
export { darkColors, lightColors } from './colors';
export {
  FONT_SCALES,
  makeStyles,
  ThemeProvider,
  useTheme,
  type ColorScheme,
  type FontScale,
  type ThemePreference,
} from './ThemeProvider';

export { paddings, radii, spacing, typography };
