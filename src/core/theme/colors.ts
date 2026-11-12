/** Her iki tema aynı anahtarlara sahiptir; bileşenler yalnızca `useTheme().colors` üzerinden okur. */
export type AppColors = {
  brand: { gold: string; goldSoft: string; goldDeep: string; ink: string; inkMuted: string };
  surface: {
    canvas: string;
    elevated: string;
    muted: string;
    inverse: string;
    /** Pro/öne çıkan kartların altın tonlu zemini. */
    goldTint: string;
    /** Altın ve gümüş ikon rozetlerinin zemini. */
    goldBadge: string;
    silverBadge: string;
    /** Alttan açılan panellerin arkasındaki karartma. */
    overlay: string;
  };
  text: { primary: string; secondary: string; tertiary: string; onGold: string; inverse: string };
  border: { subtle: string; strong: string };
  semantic: {
    up: string;
    upSoft: string;
    down: string;
    downSoft: string;
    warning: string;
    warningSoft: string;
    info: string;
  };
  /** Yükseliş/düşüş göstergesinin bölge renkleri: güçlü düşüş → güçlü yükseliş. */
  signal: { strongDown: string; down: string; up: string; strongUp: string };
  metal: { silver: string };
  chart: { line: string; fill: string; grid: string };
};

export const lightColors: AppColors = {
  brand: {
    gold: '#B8893B',
    goldSoft: '#E8D5A8',
    goldDeep: '#8A6428',
    ink: '#14181F',
    inkMuted: '#3A4250',
  },
  surface: {
    canvas: '#F3F0EA',
    elevated: '#FFFcf7',
    muted: '#E7E2D8',
    inverse: '#14181F',
    goldTint: '#FFF8EC',
    goldBadge: '#F6E9C8',
    silverBadge: '#E6E9EE',
    overlay: 'rgba(20, 24, 31, 0.4)',
  },
  text: {
    primary: '#14181F',
    secondary: '#5C6573',
    tertiary: '#8A93A1',
    onGold: '#1A1408',
    inverse: '#F7F3EC',
  },
  border: {
    subtle: '#DDD6C8',
    strong: '#C5BCAE',
  },
  semantic: {
    up: '#1F7A4C',
    upSoft: '#D8F0E3',
    down: '#B42318',
    downSoft: '#F9E0DC',
    warning: '#A15C07',
    warningSoft: '#F8E7C9',
    info: '#2F5D8C',
  },
  signal: { strongDown: '#8E1B12', down: '#E0796E', up: '#6BBF8E', strongUp: '#145234' },
  metal: { silver: '#6F7886' },
  chart: {
    line: '#B8893B',
    fill: 'rgba(184, 137, 59, 0.18)',
    grid: '#E7E2D8',
  },
};

export const darkColors: AppColors = {
  brand: {
    gold: '#D4A64F',
    goldSoft: '#5A4A2A',
    goldDeep: '#E2B866',
    ink: '#F2EEE6',
    inkMuted: '#C5BCAE',
  },
  surface: {
    canvas: '#121417',
    elevated: '#1C1F24',
    muted: '#2A2E35',
    inverse: '#F2EEE6',
    goldTint: '#252016',
    goldBadge: '#3A3020',
    silverBadge: '#2C3038',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
  text: {
    primary: '#F2EEE6',
    secondary: '#AEB6C2',
    tertiary: '#7E8794',
    onGold: '#1A1408',
    inverse: '#14181F',
  },
  border: {
    subtle: '#2E333B',
    strong: '#454B55',
  },
  semantic: {
    up: '#3FB97A',
    upSoft: '#16372A',
    down: '#F0645A',
    downSoft: '#3D1D1B',
    warning: '#E0A04A',
    warningSoft: '#3A2C12',
    info: '#6EA8E0',
  },
  signal: { strongDown: '#E5534B', down: '#B5524A', up: '#3F8E62', strongUp: '#4CC38A' },
  metal: { silver: '#A9B1BD' },
  chart: {
    line: '#D4A64F',
    fill: 'rgba(212, 166, 79, 0.18)',
    grid: '#2A2E35',
  },
};
