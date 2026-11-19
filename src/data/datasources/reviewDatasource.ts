import { appAlert } from '@/src/core/dialog/appAlert';
import { engagementDatasource } from '@/src/data/datasources/engagementDatasource';
import { Linking, Platform } from 'react-native';

type StoreReviewModule = typeof import('expo-store-review');

/**
 * `expo-store-review` yerel modülü yalnızca yeni bir native build'de bulunur; modül yoksa (eski dev
 * build, Expo Go) paketi içe aktarmak uygulamayı açılışta çökertir. Bu yüzden ilk kullanımda ve
 * hata yakalanarak yüklenir; yoksa puan isteği sessizce atlanır.
 */
async function loadStoreReview(): Promise<StoreReviewModule | null> {
  try {
    return await import('expo-store-review');
  } catch {
    return null;
  }
}

const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;

/**
 * Puan isteği iki adımlıdır: önce "memnun musun?" diye sorulur. Memnunsa işletim sisteminin puan
 * penceresi açılır; değilse mağaza yerine geri bildirim e-postasına yönlendirilir. Böylece düşük
 * puan yerine yapıcı geri bildirim toplanır. Bir kez sorulur.
 */
export const reviewDatasource = {
  async askWithCheck(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;
      const StoreReview = await loadStoreReview();
      if (!StoreReview) return;
      const state = await engagementDatasource.get();
      if (state.reviewAsked || !(await StoreReview.isAvailableAsync())) return;
      await engagementDatasource.update(() => ({ reviewAsked: true }));
      // Bildirim ya da animasyon kapanana kadar kısa bekle.
      await new Promise((resolve) => setTimeout(resolve, 1800));
      appAlert('Altın Kasam’dan memnun musun?', 'Görüşün uygulamayı geliştirmemize yardım eder.', [
        {
          text: 'Pek değil',
          style: 'cancel',
          onPress: () => {
            if (!SUPPORT_EMAIL) return;
            appAlert('Neyi geliştirelim?', 'Bize kısa bir not yazarsan memnun oluruz.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'E-posta yaz',
                onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Altın Kasam geri bildirim`),
              },
            ]);
          },
        },
        { text: 'Evet, puan ver', onPress: () => void StoreReview.requestReview().catch(() => {}) },
      ]);
    } catch {
      // Puan isteği başarısızsa sessizce geçilir.
    }
  },
};
