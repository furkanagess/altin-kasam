import type { Metadata } from 'expo-router/server';

/** Web sitesinin kök adresi; paylaşım önizlemeleri ve kanonik bağlantılar bununla kurulur. */
export const SITE_URL = 'https://altin-kasam.expo.app';
const SITE_NAME = 'Altın Kasam';
/** Paylaşım önizlemesi görseli (landing sayfasındaki ekran görüntüsü). */
const OG_IMAGE = 'https://altin-kasam.web.app/img/01-canli-altin-fiyatlari.jpg';
/** App Store kimliği; iOS Safari'de "uygulamada aç" akıllı bandı için. */
const IOS_APP_ID = '6833497567';

export const DEFAULT_DESCRIPTION =
  'Canlı gram, çeyrek ve cumhuriyet altını fiyatları, gümüş ve Brent petrol grafikleri, ekonomik takvim ve altın kasanı tek yerden takip et.';

/**
 * Sayfaya özel başlık ve açıklama: sunucu çıktısına girer, arama motorları ve paylaşım
 * önizlemeleri (WhatsApp, X, Telegram) bunu görür. Rota dosyasındaki `generateMetadata` döndürür.
 */
export function pageMetadata({ title, description = DEFAULT_DESCRIPTION, path = '/' }: {
  title?: string;
  description?: string;
  path?: string;
}): Metadata {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Canlı altın fiyatları ve kasan`;
  const url = `${SITE_URL}${path}`;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: 'tr_TR',
      type: 'website',
      images: { url: OG_IMAGE },
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: OG_IMAGE },
    itunes: { appId: IOS_APP_ID },
  };
}
