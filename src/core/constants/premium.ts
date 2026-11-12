import { TIMEFRAMES, type Currency, type Timeframe } from '@/src/core/constants/app';

/** RevenueCat panelindeki entitlement kimliği ile aynı olmalı. */
export const PREMIUM_ENTITLEMENT = 'premium';

/** Ücretsiz / Pro ayrımı tek yerden yönetilir. */
/** Grafik periyotları Pro kısıtı olmadan herkese açıktır. */
export const FREE_TIMEFRAMES: readonly Timeframe[] = TIMEFRAMES;
export const FREE_CURRENCIES: readonly Currency[] = ['TRY'];
export const FREE_HOLDING_LIMIT = 5;
export const FREE_ALARM_LIMIT = 1;
/** En güncel bu kadar haftalık analiz Pro'ya özeldir (güncel + bir önceki hafta); daha eskiler ücretsiz okunur. */
export const PRO_WEEKLY_ANALYSIS_COUNT = 2;
/** `index`: 0 en güncel analiz. */
export const isWeeklyAnalysisLocked = (index: number, isPremium: boolean) => !isPremium && index < PRO_WEEKLY_ANALYSIS_COUNT;
/** Kasayı CSV'ye aktarma ve paylaşım görseli: ücretsiz planda her biri bu kadar kez kullanılabilir. */
export const FREE_EXPORT_USES = 1;

export type PaywallReason = 'welcome' | 'value' | 'timeframe' | 'currency' | 'holdings' | 'insight' | 'widget' | 'alarm' | 'calendar' | 'weekly' | 'export' | 'shareImage';

export const PAYWALL_REASON_TEXT: Record<PaywallReason, string> = {
  welcome: 'Hoş geldin! Pro ile alarm sınırı kalkar; güncel haftalık analiz, ekonomik takvim hatırlatmaları ve daha fazlası açılır. İstersen şimdilik ücretsiz devam edebilirsin.',
  value: 'Kasan büyüyor. Pro ile alarm sınırı kalkar, güncel haftalık analiz ve ekonomik takvim açılır.',
  timeframe: '1 ay, 3 ay ve 1 yıllık grafikler Pro’ya dahildir.',
  currency: 'Fiyatları dolar ve euro ile görmek Pro’ya dahildir.',
  holdings: `Ücretsiz planda kasana en fazla ${FREE_HOLDING_LIMIT} kalem ekleyebilirsin.`,
  insight: 'Topluluk beklentisi (yükseliş/düşüş yönü) ve haber özeti Pro’ya dahildir.',
  widget: 'Seçtiğin altın veya gümüşün fiyatını ana ekran widget’ında görmek Pro’ya dahildir.',
  alarm: `Ücretsiz planda ${FREE_ALARM_LIMIT} fiyat alarmı kurabilirsin; Pro ile sınır kalkar.`,
  weekly: 'Güncel ve bir önceki haftanın analizi Pro’ya özeldir; daha eski haftaların analizlerini ücretsiz okuyabilirsin.',
  export: `Kasanı CSV olarak dışa aktarmak Pro’ya dahildir; ücretsiz planda ${FREE_EXPORT_USES} kez deneyebilirsin.`,
  shareImage: `Kasanı paylaşılabilir görsele çevirmek Pro’ya dahildir; ücretsiz planda ${FREE_EXPORT_USES} kez deneyebilirsin.`,
  calendar: 'Yaklaşan Fed, TCMB ve enflasyon açıklamaları, hatırlatmalar ve açıklanan kararların analizli raporları Pro’ya dahildir.',
};

export type PremiumFeatureId = 'insight' | 'calendar' | 'widget' | 'currencies' | 'holdings' | 'alarms' | 'weekly' | 'vaultExport';

/** Yalnızca uygulamada gerçekten bulunan özellikler listelenir (mağaza kuralı). */
export const PREMIUM_FEATURES: readonly { id: PremiumFeatureId; title: string; detail: string }[] = [
  {
    id: 'insight',
    title: 'Topluluk beklentisi',
    detail: 'Altın ve gümüş haberlerinin tonundan günlük yükseliş/düşüş yönü ve özet',
  },
  {
    id: 'calendar',
    title: 'Ekonomik takvim ve karar raporları',
    detail: 'Yaklaşan Fed, TCMB ve enflasyon açıklamaları, hatırlatmalar; açıklanan kararların analizi ve piyasa tepkisi',
  },
  {
    id: 'widget',
    title: 'Ana ekran widget’ı',
    detail: 'Seçtiğin altın çeşidi veya gümüşün fiyatı telefonunun ana ekranında',
  },
  {
    id: 'weekly',
    title: 'Güncel haftalık analizler',
    detail: 'Bu haftanın ve bir önceki haftanın analiz raporları; daha eski haftalar herkese açık',
  },
  {
    id: 'vaultExport',
    title: 'Kasa dışa aktarma ve paylaşım görseli',
    detail: `Kasanı CSV olarak aktar, yüzdelerle paylaşılabilir görsel oluştur · ücretsiz planda her biri ${FREE_EXPORT_USES} kez`,
  },
  { id: 'currencies', title: 'Dolar ve euro görünümü', detail: 'Tüm fiyatlar, grafikler ve kasan USD/EUR' },
  { id: 'holdings', title: 'Sınırsız kasa', detail: `Ücretsiz plandaki ${FREE_HOLDING_LIMIT} kalem sınırı kalkar` },
  { id: 'alarms', title: 'Sınırsız fiyat alarmı', detail: `Ücretsiz plandaki ${FREE_ALARM_LIMIT} alarm sınırı kalkar` },
];

/** Mağaza incelemesi için zorunlu; yayından önce doldurulmalı. Boşsa bağlantı gösterilmez. */
/** Yayımlanan sayfaların adresleri (taslaklar `docs/legal/`); boşsa satırlar gizlenir. */
export const LEGAL_LINKS = {
  terms: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
};
