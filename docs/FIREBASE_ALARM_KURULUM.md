# Uygulama kapalıyken fiyat alarmı (Firebase)

## Nasıl çalışır

```
Cihaz ──POST──▶ syncAlarms (Cloud Function) ──▶ Firestore: alarms/{installId}_{alarmId}
                                                   ▲
checkAlarms (her dakika, çoğunlukla hiçbir şey yapmaz)
   ├─ bekleyen alarm yok / piyasa kapalı / en yakın hedef uzak  → çıkar (Hasfiyat'a istek YOK)
   └─ aksi halde GET {uygulama}/api/alarm-values (tek istek, Hasfiyat'ın 10 sn önbelleğini paylaşır)
        └─ hedefe ulaşan alarmı işaretle → Expo Push → cihaz
```

Hasfiyat'a gidilen istek sayısı kullanıcı ya da alarm sayısıyla değil, **en yakın hedefe uzaklığa**
bağlıdır (`intervalFor`, `firebase/functions/src/index.ts`):

| En yakın hedefe uzaklık | Fiyat çekme aralığı |
| --- | --- |
| ≤ %0,5 | 1 dk |
| ≤ %1,5 | 2 dk |
| ≤ %4 | 5 dk |
| daha uzak | 15 dk |

Bekleyen alarm yoksa ve cumartesi / pazar 22:00'a kadar hiç istek atılmaz. Fiyat verisi `stale`
ise alarm tetiklenmez. Hasfiyat webhook (`price.threshold`) ya da WebSocket kullanılırsa
yalnızca `checkAlarms` değişir; istemci ve Firestore şeması aynı kalır.

## Parçalar

| Parça | Dosya |
| --- | --- |
| Fiyat → alarm değeri eşlemesi (uygulama ile ortak) | `src/core/constants/hasfiyatPriceMap.ts` |
| Hasfiyat istemcisi + önbellek | `src/server/hasfiyatPrices.ts` |
| Fiyat ucu (gizli anahtarlı) | `app/api/alarm-values+api.ts` |
| Cloud Functions | `firebase/functions/src/index.ts` (`syncAlarms`, `checkAlarms`, `cleanupAlarms`) |
| Firestore kuralları (istemci erişimi kapalı) | `firebase/firestore.rules` |
| Cihaz eşitleme | `src/data/datasources/alarmSyncDatasource.ts`, `AlarmProvider` |

## Kurulum (bir kez)

1. **Firebase planı:** Zamanlanmış fonksiyonlar için proje **Blaze** (kullandıkça öde) planında olmalı.
   Firestore'u konsoldan oluşturun (production modu, bölge tercihen `europe-west`).
2. **Android FCM:** Firebase konsolu > Proje ayarları > Android uygulaması ekle (`com.furkanages.altinkasam`)
   > `google-services.json` dosyasını proje köküne koyun (git'e girmez; `app.config.js` varsa kullanır).
   Service account anahtarını (Proje ayarları > Hizmet hesapları > Yeni özel anahtar) EAS'a yükleyin:
   `bunx eas-cli credentials` > Android > Google Service Account > FCM V1.
3. **iOS:** APNs anahtarı (`.p8`) Apple Developer'dan alınıp EAS'a yüklenir (`eas credentials`).
4. **EAS proje kimliği:** `npx eas-cli init` (`app.json` > `extra.eas.projectId` eklenir). Push token bunsuz alınamaz.
5. **Uygulama sunucusu:** `ALARM_SERVER_SECRET` ortam değişkenini uzun rastgele bir değerle tanımlayıp
   (`openssl rand -hex 32`) sunucuyu yeniden yayımlayın.
6. **Fonksiyonlar:**
   ```bash
   cd firebase/functions && npm install
   cd .. && npx firebase-tools functions:secrets:set ALARM_SERVER_SECRET   # aynı değer
   # ALARM_VALUES_URL sorulunca: https://<uygulama-adresi>/api/alarm-values
   npm --prefix functions run deploy
   ```
   Dağıtım sonunda yazılan `syncAlarms` adresini `.env.local` dosyasında
   `EXPO_PUBLIC_ALARM_SYNC_URL` olarak tanımlayın.
7. **Yeni native derleme:** `enableRemoteNotifications` ve `google-services.json` native tarafı değiştirir:
   `npm run android:aab` (ya da geliştirme derlemesi) gerekir. Expo Go ile test edilemez.

## Sınırlar ve dikkat

- **Pro sınırı sunucuda denetlenmez.** Ücretsiz plan 1 alarm sınırı yalnızca istemcidedir; sunucu cihaz başına 30 alarma izin verir.
  Sıkı denetim için RevenueCat webhook'u ile `installId` → premium eşlemesi gerekir.
- **Kimlik:** hesap yoktur; `installId` rastgele ve tahmin edilemezdir (taşıyıcı anahtar gibi). Uygulama silinirse alarmlar da yeniden kurulur.
- **Kasa toplamı alarmı** sunucuya gitmez (değer yalnızca cihazda bilinir).
- **Gizlilik:** Firebase'e varlık, yön, hedef, push token ve cihaz kimliği yazılır. `docs/legal/gizlilik-politikasi.md`
  ve mağaza veri güvenliği formu buna göre güncellenmeli (KVKK aydınlatma metni dahil).
- **Teslimat garantisi yoktur:** Expo Push / FCM / APNs en iyi çabayla çalışır; ağ ve pil tasarrufu gecikme yaratabilir.
- Hasfiyat'ın webhook / WebSocket özellikleri ve kotası bu belgede doğrulanmadı; paket sözleşmenizden kontrol edin.

## Test

1. Sunucu uçlarını elle deneyin: `curl -H "x-alarm-secret: …" https://<uygulama>/api/alarm-values` değer haritası dönmeli.
2. Uygulamada hedefi fiyatın hemen üstüne/altına bir alarm kurun; Firestore'da `alarms` koleksiyonunda belge görünmeli.
3. Uygulamayı tamamen kapatın; `checkAlarms` günlüklerini izleyin (`firebase functions:log`). Bildirim gelmeli.
4. Uygulamayı açın: alarm "tetiklendi" görünmeli ve ikinci bildirim gelmemeli.
