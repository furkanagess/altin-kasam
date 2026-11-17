import type { Href } from 'expo-router';

export type TourStep = {
  id: string;
  /** Aydınlatılacak öğenin `TourTarget` kimliği; yoksa kart ekranın ortasında çıkar. */
  target?: string;
  /** Adım gösterilirken açık olması gereken sekme. */
  route: Href;
  title: string;
  body: string;
  /** Adım açılırken ekranı en üste ya da hedefe kaydırır. */
  scroll?: { id: string; to: 'top' | 'target' };
  /** Aydınlatılan alanın en çok bu kadar yüksek gösterilmesi (uzun listeler için). */
  maxHeight?: number;
  /** Adım açıkken kullanıcıya özelliği gösteren otomatik hareket. */
  demo?: 'charts';
};

const MARKET_TOP = { id: 'market', to: 'top' } as const;
const toTarget = (id: string) => ({ id, to: 'target' }) as const;

/** İlk açılış turu: kısa tutuldu; her adım tek bakışta okunur. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    route: '/',
    scroll: MARKET_TOP,
    title: 'Altın Kasam’a hoş geldin',
    body: '30 saniyede en önemli yerleri gösterelim. İstediğin an atlayabilirsin.',
  },
  {
    id: 'ticker',
    target: 'ticker',
    route: '/',
    scroll: MARKET_TOP,
    title: 'Fiyatlar canlı akar',
    body: 'Altın, gümüş ve Brent anlık güncellenir. Birine dokun, grafiğine geç.',
  },
  {
    id: 'chart-tabs',
    target: 'chart-tabs',
    route: '/',
    scroll: MARKET_TOP,
    demo: 'charts',
    title: 'Üç grafik, tek dokunuş',
    body: 'Sekmelerle ya da yana kaydırarak geç. İşte gümüş, şimdi de Brent…',
  },
  {
    id: 'chart',
    target: 'chart',
    route: '/',
    scroll: MARKET_TOP,
    title: 'Zamanda yolculuk',
    body: 'Zaman aralığını seç, para birimini değiştir, fiyat alarmı kur ya da tam ekrana geç.',
  },
  {
    id: 'gold-list',
    target: 'gold-list',
    route: '/',
    scroll: toTarget('market'),
    maxHeight: 250,
    title: 'Tüm altın çeşitleri',
    body: 'Gram, çeyrek, bilezik… Bir satıra dokun: kasana ekle, alarm kur ya da detayına bak.',
  },
  {
    id: 'fab',
    target: 'fab',
    route: '/',
    scroll: MARKET_TOP,
    title: 'Kasana ekle',
    body: 'Aldığın altını bu düğmeyle kaydet. Basılı tutup istediğin kenara sürükleyebilirsin.',
  },
  {
    id: 'analysis-ratio',
    target: 'analysis-ratio',
    route: '/analytics',
    scroll: toTarget('analytics'),
    title: 'Altın/gümüş rasyosu',
    body: 'Gümüşün altına göre ucuz mu pahalı mı olduğunu gösterir. Zil ile alarm kurabilirsin.',
  },
  {
    id: 'analysis-calendar',
    target: 'analysis-calendar',
    route: '/analytics',
    scroll: toTarget('analytics'),
    maxHeight: 300,
    title: 'Piyasayı oynatan veriler',
    body: 'Faiz, enflasyon, istihdam… Açıklanan verinin altına etkisini raporda oku.',
  },
  {
    id: 'analysis-weekly',
    target: 'analysis-weekly',
    route: '/analytics',
    scroll: toTarget('analytics'),
    maxHeight: 300,
    title: 'Haftalık analiz',
    body: 'Her hafta yön beklentisi ve nedenleri. En güncel analiz Pro’da.',
  },
  {
    id: 'community-insight',
    target: 'community-insight',
    route: '/community',
    scroll: toTarget('community'),
    title: 'Topluluk ne düşünüyor?',
    body: 'Haber ve yorumlardan çıkan altın–gümüş beklentisi burada (Pro). Altında canlı haber akışı var.',
  },
  {
    id: 'vault-body',
    target: 'vault-body',
    route: '/portfolio',
    scroll: toTarget('portfolio'),
    maxHeight: 360,
    title: 'Kasan burada',
    body: 'Eklediğin her şey burada toplanır: değer, kâr/zarar, dağılım. Verilerin yalnızca telefonunda kalır.',
  },
  {
    id: 'done',
    route: '/',
    scroll: MARKET_TOP,
    title: 'Hepsi bu!',
    body: 'İlk varlığını ekle, bir alarm kur. Turu Ayarlar’dan istediğin zaman tekrar izleyebilirsin.',
  },
];
