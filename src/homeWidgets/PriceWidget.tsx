import type { HomeWidgetProps } from '@/src/domain/models';

/**
 * Web ve tip denetimi için yer tutucu; asıl widget'lar `PriceWidget.ios.tsx` ve
 * `PriceWidget.android.tsx` dosyalarındadır. Web'de ana ekran widget'ı yoktur.
 */
const PriceWidget: { updateSnapshot(props: HomeWidgetProps): void } | null = null;

export default PriceWidget;
