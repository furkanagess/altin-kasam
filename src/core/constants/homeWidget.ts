import { GOLD_ASSETS } from '@/src/core/constants/goldAssets';
import { MetalSymbol } from '@/src/domain/enums';

/** app.json'daki `expo-widgets` eklentisinde tanımlı widget adıyla aynı olmalı. */
export const HOME_WIDGET_NAME = 'PriceWidget';

export const SILVER_WIDGET_OPTION_ID = 'gram-gumus';
export const DEFAULT_HOME_WIDGET_OPTION_ID = 'gram-24';

/** Uygulama açıkken fiyat bundan sık gönderilmez; widget güncellemeleri sistem bütçesinden yer. */
export const HOME_WIDGET_UPDATE_INTERVAL_MS = 60_000;

export type HomeWidgetOption = { id: string; label: string; metal: MetalSymbol };

/** Widget'ta gösterilebilecek birimler: tüm altın çeşitleri ve gram gümüş. */
export const HOME_WIDGET_OPTIONS: HomeWidgetOption[] = [
  ...GOLD_ASSETS.map((asset) => ({ id: asset.id, label: asset.label, metal: MetalSymbol.XAU })),
  { id: SILVER_WIDGET_OPTION_ID, label: 'Gram Gümüş', metal: MetalSymbol.XAG },
];

export function getHomeWidgetOption(id: string): HomeWidgetOption | undefined {
  return HOME_WIDGET_OPTIONS.find((option) => option.id === id);
}
