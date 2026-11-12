import type { AnalysisOutlook } from '@/src/domain/models';

export const OUTLOOK_LABELS: Record<AnalysisOutlook, string> = {
  up: 'Yükseliş yönlü',
  down: 'Düşüş yönlü',
  neutral: 'Yatay',
};

export const OUTLOOK_TONES: Record<AnalysisOutlook, 'up' | 'down' | 'neutral'> = {
  up: 'up',
  down: 'down',
  neutral: 'neutral',
};

export const ANALYSIS_METAL_LABELS = { gold: 'Altın', silver: 'Gümüş' } as const;
