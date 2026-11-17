import type { Href } from 'expo-router';

export type TourStep = {
  id: string;
  /** Aydınlatılacak öğenin `TourTarget` kimliği; yoksa kart ekranın ortasında çıkar. */
  target?: string;
  /** Adım gösterilirken açık olması gereken sekme. */
  route: Href;
  title: string;
  body: string;
};

/** İlk açılış turunun adımları; sıra, ekranda yukarıdan aşağıya ve sekmeden sekmeye gezer. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'welcome',
    route: '/',
    title: 'Altın Kasam’a hoş geldin',
    body: 'Uygulamayı bir dakikada gezdirelim. Her adımda neyin ne işe yaradığını göstereceğim. İstediğin an atlayabilirsin; turu sonra Ayarlar’dan yeniden izleyebilirsin.',
  },
  {
    id: 'ticker',
    target: 'ticker',
    route: '/',
    title: 'Canlı fiyat şeridi',
    body: 'Gram altın, ons, gümüş ve Brent petrol burada anlık akar. Bir fiyata dokunursan o varlığın grafiğine geçersin. Fiyatların en son ne zaman güncellendiğini üst çubukta görürsün.',
  },
  {
    id: 'chart-tabs',
    target: 'chart-tabs',
    route: '/',
    title: 'Altın, gümüş ve Brent',
    body: 'Üç grafik arasında bu sekmelerle geçersin; grafiği yana kaydırarak da değiştirebilirsin. Brent petrol varil fiyatıdır ve dolar cinsinden gösterilir.',
  },
  {
    id: 'unit',
    target: 'unit-switcher',
    route: '/',
    title: 'Gram mı, ons mu?',
    body: 'Fiyatı kuyumcudaki gibi gram olarak ya da uluslararası piyasadaki gibi ons olarak görebilirsin. Seçimin grafikte ve alarm kurarken de geçerli olur.',
  },
  {
    id: 'chart',
    target: 'chart',
    route: '/',
    title: 'Grafiği oku',
    body: 'Altındaki zaman aralıklarıyla geçmiş fiyata bak; uzun dönemler Pro’da. Sağ üstten para birimini değiştirebilir, fiyat alarmı kurabilir ve tam ekran detaya geçebilirsin.',
  },
  {
    id: 'gold-list',
    route: '/',
    title: 'Altın çeşitleri',
    body: 'Grafiğin altında gram, çeyrek, bilezik gibi tüm altın çeşitleri alış ve satış fiyatıyla sıralanır. Bir satıra dokununca açılır: oradan kasana ekleyebilir, fiyat alarmı kurabilir ya da detayına bakabilirsin.',
  },
  {
    id: 'pro',
    target: 'header-pro',
    route: '/',
    title: 'Pro üyelik',
    body: 'Dolar/euro görünümü, uzun dönem grafikler, topluluk beklentisi, takvim hatırlatmaları ve ana ekran widget’ı Pro’da. Üyeysen durumun burada görünür ve avantajlarını açabilirsin.',
  },
  {
    id: 'settings',
    target: 'header-settings',
    route: '/',
    title: 'Ayarlar',
    body: 'Açık/koyu görünüm, yazı boyutu, haber kaynakları ve yatırım hedefin burada. Bir öneri ya da sorun için bize de buradan yazabilirsin.',
  },
  {
    id: 'fab',
    target: 'fab',
    route: '/',
    title: 'Kasana varlık ekle',
    body: 'Aldığın altını, gümüşü ya da nakdi kasana eklemek için bu altın düğmeye dokun. Her ekranda durur; basılı tutup sürükleyerek istediğin kenara taşıyabilirsin.',
  },
  {
    id: 'tab-analysis',
    target: 'tab-analytics',
    route: '/analytics',
    title: 'Analiz',
    body: 'Haberlerin altına etkisini, haftalık analizi ve faiz, enflasyon gibi veriler için ekonomik takvimi burada bulursun. Güncel haftalık analiz ve takvim hatırlatmaları Pro’da.',
  },
  {
    id: 'tab-community',
    target: 'tab-community',
    route: '/community',
    title: 'Topluluk',
    body: 'Takip ettiğin kaynaklardan haberler ve yorumlar burada akar. Bir kaynağı takip edersen yeni haber geldiğinde bildirim alırsın. Topluluğun fiyat beklentisi de burada (Pro).',
  },
  {
    id: 'tab-portfolio',
    target: 'tab-portfolio',
    route: '/portfolio',
    title: 'Kasam',
    body: 'Eklediğin tüm varlıklar burada: toplam değer, kâr/zarar ve aylık gram hedefine ilerleyişin. Kasan yalnızca telefonunda durur; istersen kart olarak paylaşabilirsin.',
  },
  {
    id: 'done',
    route: '/',
    title: 'Hazırsın!',
    body: 'Piyasaya göz at, ilk varlığını ekle ve bir fiyat alarmı kur. Turu istediğin zaman Ayarlar > Uygulama turu’ndan yeniden başlatabilirsin.',
  },
];
