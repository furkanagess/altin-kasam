export const colors = {
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
    info: '#2F5D8C',
  },
  chart: {
    line: '#B8893B',
    fill: 'rgba(184, 137, 59, 0.18)',
    grid: '#E7E2D8',
  },
} as const;

export type AppColors = typeof colors;
