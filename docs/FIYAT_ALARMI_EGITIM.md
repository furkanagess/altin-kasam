# Fiyat Alarmı Sistemi: Eğitim Dokümanı (Android + iOS, React Native / Expo)

Bu belge, "Altın Kasam" uygulamasındaki fiyat alarmı sistemini baştan sona anlatır: kullanıcı
alarm kurduğunda ne olduğundan, uygulama tamamen kapalıyken telefona bildirimin nasıl ulaştığına
kadar. Bir eğitim materyali gibi okunabilir. Her adım için **ne olur**, **neden öyle yapıldı**,
**hangi dosyada** ve **hangi React Native kavramı** kullanıldı yazılıdır.

Flutter karşılıkları ayrı bir belgededir: [FIYAT_ALARMI_FLUTTER_KARSILIKLARI.md](FIYAT_ALARMI_FLUTTER_KARSILIKLARI.md).
Daha kısa referanslar: [BILDIRIM_SISTEMI.md](BILDIRIM_SISTEMI.md) (bildirim türleri),
[FIREBASE_ALARM_KURULUM.md](FIREBASE_ALARM_KURULUM.md) (kurulum adımları),
[HASFIYAT_REST_ISTEKLERI.md](HASFIYAT_REST_ISTEKLERI.md) (maliyet).

İçindekiler

1. Büyük resim
2. Temel kavramlar (önce bunları öğrenin)
3. Adım adım akış
4. Android'e özgü adımlar
5. iOS'a özgü adımlar
6. Sunucu tarafı ayrıntılı
7. Kaynak kod rehberi
8. React Native kavramları bu projede nerede?
9. Ekip çalışmasında dikkat edilecekler
10. Bu projede yaşanan hatalar ve dersleri
11. Mülakat soruları
12. Alıştırmalar

---

## 1. Büyük resim

Problem: Kullanıcı "Gram altın 6.500 ₺'nin üstüne çıkınca haber ver" der. Uygulama kapalı olsa
bile bildirim gelmelidir.

Bir mobil uygulama kapalıyken kod çalıştıramaz. Bu yüzden iki parçalı bir çözüm vardır:

| Durum | Kim kontrol eder? | Bildirimi kim üretir? |
| --- | --- | --- |
| Uygulama **açık** | Cihazdaki kod (`AlarmProvider`) | Cihaz kendisi (yerel bildirim) |
| Uygulama **kapalı / arka planda** | Sunucu (Firebase Cloud Functions) | Sunucu gönderir, işletim sistemi ekrana basar (push) |

```
                         ┌──────────────────────────────┐
 Kullanıcı alarm kurar   │  Telefon (React Native)       │
 ───────────────────────▶│  AsyncStorage'a yazar          │
                         │  Push token alır              │
                         │  syncAlarms'a POST eder       │
                         └──────────────┬───────────────┘
                                        │ HTTPS
                                        ▼
                         ┌──────────────────────────────┐
                         │ Firebase Cloud Function       │
                         │ syncAlarms  ─▶ Firestore      │
                         └──────────────────────────────┘
                                        ▲
        her dakika                      │ okur
 ┌─────────────────────┐   ┌────────────┴─────────────┐   ┌───────────────────┐
 │ Cloud Scheduler     │──▶│ checkAlarms              │──▶│ Uygulama sunucusu │
 └─────────────────────┘   │ - piyasa açık mı?        │   │ /api/alarm-values │
                           │ - hedef yakın mı?        │   └─────────┬─────────┘
                           │ - fiyat çek, karşılaştır │             │
                           └────────────┬─────────────┘             ▼
                                        │                   ┌───────────────┐
                                        │ hedef aşıldı      │ Hasfiyat REST │
                                        ▼                   └───────────────┘
                         ┌──────────────────────────────┐
                         │ Expo Push Service            │
                         └──────┬───────────────┬───────┘
                                │               │
                         ┌──────▼─────┐   ┌─────▼──────┐
                         │ FCM        │   │ APNs       │
                         │ (Android)  │   │ (iOS)      │
                         └──────┬─────┘   └─────┬──────┘
                                ▼               ▼
                          Android telefon    iPhone  ──▶ bildirim ekranda
```

Önemli tasarım kararları ve nedenleri:

- **Hesap yok.** Kullanıcı girişi eklenmedi; cihaz rastgele bir `installId` üretir. Bu, KVKK
  yükünü ve ürün karmaşıklığını azaltır. Bedeli: kimlik doğrulaması zayıf (bkz. bölüm 6.6).
- **Çift yol (yerel + sunucu).** Sunucu ulaşılamazsa uygulama açıkken alarm yine çalışır. Sunucu
  alarmı bir *iyileştirme*dir, tek başarısızlık noktası değildir.
- **Expo Push Service.** FCM (Android) ve APNs (iOS) farkını soyutlar; sunucu tek bir API'ye
  konuşur. Alternatifi FCM'yi doğrudan kullanmaktır (Flutter belgesinde anlatılır).
- **Hasfiyat'ı doğrudan çağırmayız.** Anahtar sunucuda kalır; istemci kendi sunucu uçlarını çağırır.

---

## 2. Temel kavramlar (önce bunları öğrenin)

### 2.1 Yerel bildirim vs uzak (push) bildirim

| | Yerel bildirim | Uzak (push) bildirim |
| --- | --- | --- |
| Kim üretir | Uygulamanın kendisi | Sunucu |
| Kapalıyken | Yalnızca **önceden zamanlanmışsa** (ör. takvim hatırlatması) | Çalışır |
| Fiyat alarmına uygun mu | Hayır (fiyatı bilemez) | Evet |
| API | `scheduleNotificationAsync` | Expo Push API / FCM / APNs |

Fiyat alarmı "ne zaman" olacağını önceden bilemeyeceğimiz bir olaydır; bu yüzden sunucu şart.

### 2.2 Push zinciri: APNs, FCM, Expo Push

- **APNs (Apple Push Notification service):** iOS'un tek push yolu. Apple'a özgü.
- **FCM (Firebase Cloud Messaging):** Android'in push altyapısı (Google). iOS'a da APNs üzerinden köprü olabilir.
- **Expo Push Service:** Expo'nun bu ikisinin önüne koyduğu ortak servis. İstemci bir `ExponentPushToken[...]`
  alır, sunucu bu token'a `POST https://exp.host/--/api/v2/push/send` ile mesaj gönderir; Expo,
  gerçek cihaz tipine göre FCM ya da APNs'e iletir.

### 2.3 Push token

Cihaz ve uygulamayı tanımlayan, işletim sisteminin verdiği adres. Özellikleri:

- Cihaz/uygulama kurulumuna özgüdür; uygulama silinip kurulursa **değişebilir**.
- Gizli sayılmalıdır (bilen kişi o cihaza bildirim gönderebilir).
- Geçersizleşebilir: sunucu bunu `DeviceNotRegistered` hatasıyla öğrenir ve kaydı silmelidir.

### 2.4 İzin (permission)

- **iOS:** İlk istekte sistem penceresi çıkar. Kullanıcı reddederse uygulama tekrar soramaz,
  yalnızca Ayarlar'a yönlendirebilir.
- **Android 13+:** `POST_NOTIFICATIONS` çalışma zamanı izni vardır; eski sürümlerde yoktur.
- Reddedilirse push token alınamaz. Bu projede kod bunu zarifçe ele alır: token yoksa sunucu
  eşitlemesi atlanır, alarm yalnızca uygulama açıkken çalışır.

### 2.5 Uygulama durumları

| Durum | Anlamı | Bildirim davranışı |
| --- | --- | --- |
| Ön plan (foreground) | Uygulama ekranda | Sistem bildirimi **göstermez**, uygulama bir *handler* ile karar verir |
| Arka plan (background) | Ekrandan çıkmış, süreç yaşıyor | Sistem gösterir |
| Kapalı (terminated) | Süreç yok | Sistem gösterir; dokununca uygulama soğuk açılır |

Bu yüzden `setNotificationHandler` vardır: ön plandayken de banner gösterilsin diye.

### 2.6 Android bildirim kanalı

Android 8+'ta her bildirim bir **kanala** aittir; sesi, önemi, titreşimi kullanıcı kanal bazında
ayarlar. Bu projede kanal kimliği `price-alarms`'tır. Sunucu mesajı `channelId: 'price-alarms'`
ile gönderir; kanal istemcide, izin istenirken oluşturulur. Kanal kimliği **değiştirilemez**:
kullanıcının ayarı kimliğe bağlıdır.

### 2.7 Idempotency (tekrarlanabilirlik)

Aynı alarm iki kez bildirilmemelidir. Bu projede üç mekanizma vardır:

1. Sunucu bildirimi göndermeden **önce** alarmı "tetiklendi" işaretler (gönderim yarıda kesilse
   bile tekrarlanmaz).
2. İstemci açılışta sunucunun tetiklediği alarmları öğrenir ve yerelde işaretler.
3. İstemci yerel kontrolü, açılış eşitlemesi bitene kadar bekletir (`ready` bayrağı).

### 2.8 Firestore, Cloud Functions, Scheduler

- **Firestore:** Firebase'in belge tabanlı NoSQL veritabanı. Burada alarmları saklar.
- **Cloud Functions (v2):** Sunucusuz fonksiyonlar. Üç tanesi var: HTTP ile tetiklenen `syncAlarms`,
  zamanlanmış `checkAlarms` ve `cleanupAlarms`.
- **Cloud Scheduler:** `onSchedule('every 1 minutes')` ile otomatik oluşur.
- **Blaze planı:** Zamanlanmış fonksiyonlar için zorunlu (kullandıkça öde).

### 2.9 Expo'ya özgü kavramlar

- **CNG (Continuous Native Generation):** `android/` ve `ios/` klasörleri `app.json`'dan
  *üretilir* (`expo prebuild`); elle düzenlenmez, git'e girmez.
- **Config plugin:** Native proje dosyalarını (Info.plist, build.gradle, entitlement) JS ile
  değiştiren eklenti. `app.json > plugins` içinde listelenir.
- **EAS Build:** Bulutta derleme. **EAS Credentials**: sertifika, profil, push anahtarlarının saklandığı yer.
- **Expo Router:** Dosya tabanlı yönlendirme (`app/alarm.tsx` → `/alarm`).
- **API Routes:** `app/api/*+api.ts` dosyaları sunucu uçlarıdır (Expo Hosting'de çalışır).

---

## 3. Adım adım akış

Aşağıdaki adımlar zaman sırasındadır. Her adımda dosya adları verilmiştir.

### Adım 1: Kullanıcı alarm ekranını açar

- Ekran: `app/alarm.tsx`. Yönlendirme Expo Router ile; varlık `?assetId=gram-24` parametresiyle gelir
  (`useLocalSearchParams`).
- Hangi varlıkların alarm kurulabildiği: `src/core/constants/alarmAssets.ts` (`getAlarmAsset`).
  Tür: altın çeşidi, gram metal, kasa toplamı, altın/gümüş rasyosu.
- Güncel fiyatı ekran `useAlarmPrices()` ile alır (`src/viewmodels/alarm/useAlarmPrices.ts`),
  bu hook piyasa ve kasa verisini birleştirir.

> RN kavramı: **Expo Router parametreleri**, **custom hook** (`useAlarmPrices`), **Context** (`useAlarms`).

### Adım 2: Kullanıcı yön ve hedef girer, "Alarm kur"a basar

- `app/alarm.tsx` içinde `addAlarm({ assetId, direction, target })` çağrılır.
- Ücretsiz plan sınırı kontrol edilir: `canAdd = isPremium || activeCount < FREE_ALARM_LIMIT`
  (`src/core/constants/premium.ts`). Sınır doluysa ödeme ekranı açılır.

### Adım 3: Bildirim izni istenir

- `AlarmProvider.addAlarm` içinde `notificationsDatasource.ensurePermission()` çağrılır.
- Android'de önce `price-alarms` kanalı oluşturulur, sonra izin kontrol edilip gerekirse istenir.
- **Reddedilse bile alarm kaydedilir**: tetiklenince uygulama açıksa `Alert` ile bildirilir.
- Dosya: `src/data/datasources/notificationsDatasource.ts`.

> Neden `require` ile geç yükleme? `expo-notifications` içe aktarıldığı an native modülü ister;
> modül olmayan ortamda (web, eski dev build) uygulama çökmesin diye `load()` fonksiyonu
> `try/catch` ile ilk kullanımda yükler. Bu, **savunmacı native modül erişimi** örneğidir.

### Adım 4: Alarm cihazda saklanır

- `alarmRepository.add(input)` yeni bir `PriceAlarm` üretir (rastgele `id`, `createdAt`) ve
  `AsyncStorage`'a yazar (anahtar `altin_kasam_alarms_v1`).
- Dosya: `src/data/repositories/alarmRepository.ts`; depolama sarmalayıcısı `src/core/storage/storage.ts`.
- `AlarmProvider` `setAlarms(...)` ile durumu günceller → ekran yeniden çizilir.

> RN kavramı: **AsyncStorage** (anahtar-değer, asenkron, şifresiz), **Repository deseni**.

### Adım 5: Push token alınır

- Alarm listesi değişince bir `useEffect` çalışır ve `syncServer(alarms)` çağırır.
- `notificationsDatasource.getPushToken()`:
  - İzin yoksa `null` döner.
  - `Constants.expoConfig.extra.eas.projectId` ile `getExpoPushTokenAsync({ projectId })` çağrılır.
  - Hata olursa `null` (ör. `google-services.json` yok, cihaz desteklemiyor).
- Token yoksa sunucu eşitlemesi **atlanır**, uygulama yerel modda çalışır.

### Adım 6: Alarmlar sunucuya eşitlenir

- `alarmSyncDatasource.sync(token, alarms)` bir `POST` atar: `{ installId, pushToken, alarms }`.
- `installId`: ilk kullanımda `Math.random` ile üretilir, `AsyncStorage`'a kaydedilir.
- Gönderilen alarmlar *yalnızca bekleyenler* ve kasa toplamı hariçtir (`syncPayload`); her alarma
  bildirim metni için `label`, `noun`, `unit` eklenir. **Sunucu varlık adlarını bilmez, istemci söyler.**
- `lastSynced` (bir `useRef`) ile aynı liste tekrar gönderilmez (imza karşılaştırması).
- Adres (`EXPO_PUBLIC_ALARM_SYNC_URL`) yoksa tüm adım atlanır.

> Neden tam liste gönderilir, tek tek ekleme/silme değil? **Durum eşitleme (state sync)**
> idempotent ve basittir: aynı istek iki kez gelse sonuç aynıdır; kaybolan bir istek bir sonrakiyle
> düzelir. Bedeli: yük biraz daha büyüktür (en çok 30 alarm).

### Adım 7: Sunucu alarmları Firestore'a yazar

- `syncAlarms` (`firebase/functions/src/index.ts`) isteği doğrular:
  - Yalnızca `POST`.
  - `installId` biçimi (`[\w-]{16,}`), token biçimi (`ExponentPushToken[...]`), alarm alanları
    (yön, pozitif hedef, metin uzunlukları), en çok 30 alarm.
- Belge kimliği `${installId}_${alarmId}` → aynı alarm yeniden gelirse üzerine yazılır (idempotent).
- Listede olmayan eski alarmlar silinir; sunucuda **tetiklenmiş** bir alarm listedeyse yanıtla
  `{ triggered: [{ id, at }] }` olarak istemciye bildirilir.
- Bir `batch.commit()` ile atomik yazılır.

### Adım 8: Zamanlayıcı her dakika `checkAlarms`'ı çalıştırır

`checkAlarms` çoğu dakika **hiçbir şey yapmaz**; Hasfiyat'a nadiren gider. Karar sırası:

1. **Piyasa kapalı mı?** (Cumartesi ve pazar 22:00'a kadar İstanbul saatiyle) → çık.
2. **Bekleyen alarm var mı?** (`where('triggeredAt', '==', null)`) → yoksa çık.
3. **Hedefe uzaklık:** son bilinen fiyatlara (`meta/poll` belgesi) göre en yakın hedefin yüzde
   uzaklığı bulunur. `intervalFor`: ≤%0,5 → 1 dk, ≤%1,5 → 2 dk, ≤%4 → 5 dk, daha uzak → 15 dk.
   Son çekimden bu yana süre dolmadıysa çık.
4. Aksi halde fiyat çekilir (Adım 9).

### Adım 9: Fiyat çekilir

- `checkAlarms`, uygulama sunucusundaki `/api/alarm-values` ucunu `x-alarm-secret` başlığıyla çağırır.
- Uç (`app/api/alarm-values+api.ts`): gizli anahtarı kontrol eder; `loadPrices()` (`src/server/hasfiyatPrices.ts`)
  ile Hasfiyat'tan tek istekle tüm kalemleri alır; `alarmValuesFromItems`
  (`src/core/constants/hasfiyatPriceMap.ts`) ile `{ 'gram-24': 6339.02, ... }` haritasına çevirir.
- **Veri bayat ise** (`stale`) alarm tetiklenmez.
- Anahtar yoksa `503`, yanlışsa `401` döner (ikisi ayrı: hata ayıklamayı kolaylaştırır).

### Adım 10: Hedef aşıldı mı?

- Her bekleyen alarm için: `above` ise `fiyat >= hedef`, `below` ise `fiyat <= hedef`.
- Aynı mantığın istemci kopyası `alarmRepository.due` içindedir (yalnızca uygulama açıkken kullanılır).

### Adım 11: Önce işaretle, sonra gönder

```ts
// firebase/functions/src/index.ts (özet)
const batch = db.batch();
for (const { ref } of hits) batch.update(ref, { triggeredAt: now.toISOString() });
await batch.commit();      // 1) önce kalıcı işaretle
await sendPush(db, hits);  // 2) sonra gönder
```
Sıra bilinçlidir: işaretleme başarılı, gönderim başarısızsa bildirim *kaybolur* ama *tekrarlanmaz*.
Ters sırada, gönderim başarılı + işaretleme başarısız olursa kullanıcı her dakika aynı bildirimi
alırdı. Bu projede "kaybolmak, tekrarlanmaktan iyidir" tercih edildi.

### Adım 12: Expo Push Service'e gönderim

- 100'lük gruplar halinde `POST https://exp.host/--/api/v2/push/send`.
- Mesaj: `{ to, sound: 'default', channelId: 'price-alarms', title, body, data: { path: '/' } }`.
- Başlık: `<Varlık adı> Alarmı Tetiklendi`; alt metin: `Güncel Fiyat 6.361,52`.
- Cevapta `DeviceNotRegistered` hatası alınan token'ların alarmları silinir (ölü token temizliği).
- Bilinen eksik: yalnızca *ticket*'lar okunur; **receipt** (nihai teslim sonucu) sorgulanmaz.

### Adım 13: Expo → FCM / APNs → telefon

Expo, token'ın platformuna bakar:

- **Android:** FCM v1 API'sine iletir (EAS'a yüklediğimiz servis hesabı anahtarıyla yetkilendirir).
- **iOS:** APNs'e iletir (EAS'a yüklediğimiz `.p8` anahtarıyla).

Sonra işletim sistemi bildirimi ekrana basar. Uygulamanın kodu çalışmaz (kapalıysa).

### Adım 14: Kullanıcı bildirime dokunur

- `app/_layout.tsx`: `useEffect(() => notificationsDatasource.onOpen((path) => router.push(path)), [])`.
- `onOpen` iki şeyi birleştirir: uygulama **bildirimle soğuk açıldıysa** `getLastNotificationResponseAsync()`,
  açıkken dokunulursa `addNotificationResponseReceivedListener`.
- `data.path` `/` ile başlıyorsa yönlendirilir (basit bir **açık yönlendirme doğrulaması**: rastgele
  bir şema/URL açılmaz).

### Adım 15: Uygulama açılır, durum uzlaşır

- `AlarmProvider` açılışta: yerel listeyi okur → `syncServer` ile eşitler → sunucunun tetiklediği
  alarmlar yanıtla gelir → `alarmRepository.markTriggered` ile yerelde "tetiklendi" yapılır →
  `setReady(true)`.
- `ready` olmadan yerel `due` kontrolü çalışmaz. Aksi halde sunucunun zaten bildirdiği alarm,
  uygulama açılır açılmaz **ikinci kez** yerel bildirim üretirdi (yarış durumu).

### Adım 16 (uygulama açıkken): Yerel yol

Sürekli açık uygulamada `useEffect` fiyat veya alarm değişince `alarmRepository.due(...)` çalıştırır:
önce `markTriggered`, sonra `notificationsDatasource.present(...)`, o başarısızsa (izin yok) `Alert`.
Web'de `Alert.alert` çalışmadığı için `window.alert` kullanılır.

---

## 4. Android'e özgü adımlar

| Adım | Nerede | Neden |
| --- | --- | --- |
| Firebase projesine Android uygulaması ekle (`com.furkanages.altinkasam`) | Firebase konsolu | FCM'nin uygulamayı tanıması |
| `google-services.json` indir, proje köküne koy | Dosya (git'e girmez) | `expo-notifications`'ın FCM token alması; `app.config.js` dosya varsa `android.googleServicesFile` ekler |
| FCM V1 servis hesabı anahtarını EAS'a yükle | `eas credentials` > Android > Google Service Account | Expo Push'un FCM'e **sizin adınıza** göndermesi |
| `enableRemoteNotifications: true` | `app.json` > `expo-notifications` eklentisi | Uzak bildirim yeteneğini açar |
| Kanal oluşturma | `ensurePermission` içinde `setNotificationChannelAsync` | Android 8+ gereksinimi |
| `POST_NOTIFICATIONS` izni | `requestPermissionsAsync` yönetir | Android 13+ |
| Yeni derleme | `npx expo run:android` ya da `npm run android:aab` | Native kodu değiştiren her ayar yeni derleme ister, OTA güncelleme yetmez |

Android'e özgü tuzaklar:

- **Pil optimizasyonu / üretici kısıtları** (Xiaomi, Huawei, bazı Samsung modları) kapatılmış uygulamanın
  push almasını geciktirebilir. Gerçek cihazda test edin.
- **`am force-stop` (Ayarlar > Durdur)** uygulamayı "durmuş" durumuna sokar; bu durumda FCM mesajı
  uygulamaya teslim **edilmez**. Kullanıcının uygulamayı son uygulamalardan kaydırması ise genelde sorun olmaz.
- FCM legacy API kapatıldı; **V1 servis hesabı** şart.

---

## 5. iOS'a özgü adımlar

| Adım | Nerede | Neden |
| --- | --- | --- |
| Ücretli Apple Developer hesabı | developer.apple.com | Push yetkisi ücretsiz hesapta yok |
| APNs Auth Key (`.p8`) oluştur | Certificates, Identifiers & Profiles > Keys | Expo'nun APNs'e göndermesi; Key ID ve Team ID not edilir |
| `.p8`'i EAS'a yükle | `eas credentials` > iOS > Push Notifications | Anahtar bir kez indirilebilir; saklayın |
| `aps-environment` entitlement | `enableRemoteNotifications: true` + prebuild | Uygulamanın push alabilmesi için imzaya gömülür |
| Dağıtım sertifikası + provisioning profil | EAS otomatik üretir (`yes` deyin) | Mağaza imzalaması |
| TestFlight | `eas build` + `eas submit` | Gerçek APNs (production) ortamı |
| Gerçek cihazda test | iPhone | Simülatör güvenilir push token vermez |

Notlar:

- **APNs ortamları:** `development` (sandbox) ve `production`. EAS'ın yönettiği anahtar ikisini de
  kapsar; dağıtım build'inde profil üretim ortamını seçer.
- **İzin penceresi tek seferliktir.** Reddedilirse uygulama içinden tekrar çıkmaz.
- **Düşük Güç Modu / Odak (Focus)** bildirimleri geciktirebilir ya da sessize alabilir.
- **Widget uzantısı** (`ExpoWidgetsTarget`) ayrı bir imza hedefidir; ayrı bundle id ve App Group ister.
  EAS, kimlik bilgilerini **her hedef için** ayrı hazırlar.

---

## 6. Sunucu tarafı ayrıntılı

### 6.1 Firestore veri modeli

Koleksiyon `alarms`, belge kimliği `${installId}_${alarmId}`:

| Alan | Anlamı |
| --- | --- |
| `installId`, `alarmId` | Sahip cihaz ve alarm |
| `pushToken` | Hedef cihaz adresi |
| `assetId`, `direction`, `target` | Ne izleniyor, hangi yönde, hangi seviye |
| `label`, `noun`, `unit` | Bildirim metni için (istemci gönderir) |
| `triggeredAt` | `null`: bekliyor; ISO tarih: tetiklendi |
| `createdAt` | Oluşturma zamanı |

`meta/poll` belgesi: son fiyat çekim zamanı ve son bilinen değerler (uzaklık hesabı için).

### 6.2 Güvenlik kuralları

`firebase/firestore.rules`: `allow read, write: if false;`. **İstemci Firestore'a doğrudan erişemez.**
Yalnızca Cloud Functions (Admin SDK, kuralları atlar) okur/yazar. İstemci SDK'sı hiç eklenmedi,
bu yüzden uygulama paketi küçük kalır ve App Check/Auth zorunluluğu doğmaz.

### 6.3 Sırlar ve ortam değişkenleri

| Değişken | Nerede | Görünürlük |
| --- | --- | --- |
| `ALARM_SERVER_SECRET` | EAS (uygulama sunucusu) ve Firebase Secret Manager | Gizli |
| `HASFIYAT_API_KEY` | EAS (uygulama sunucusu) | Gizli |
| `ALARM_VALUES_URL` | `firebase/functions/.env` | Gizli değil |
| `EXPO_PUBLIC_ALARM_SYNC_URL` | EAS ve `.env.local` | Herkese açık (pakete gömülür) |

Dikkat: `EXPO_PUBLIC_` önekli değişkenler JS paketine **gömülür**; sır koymayın.
Expo Hosting'de `secret` görünürlüğü sunucuya **dağıtılmaz**; `sensitive` kullanılır.

### 6.4 Hasfiyat maliyet kontrolü

Bkz. [HASFIYAT_REST_ISTEKLERI.md](HASFIYAT_REST_ISTEKLERI.md). Alarm tarafında: bekleyen alarm yoksa ve
piyasa kapalıyken hiç istek yok, hedef uzaksa seyrek istek.

### 6.5 Gözlemlenebilirlik

`checkAlarms` her çalışmada günlük yazar: `atlandı: piyasa kapalı`, `atlandı: hedef uzak`,
`fiyat çekildi`, `alarm tetiklendi`. İzlemek için:
`npx firebase-tools functions:log --only checkAlarms`.

### 6.6 Bilinen güvenlik ve tasarım sınırları (dürüst liste)

1. `syncAlarms` herkese açık bir HTTP ucu; kimlik doğrulaması yok. `installId` bir "taşıyıcı anahtar"
   gibi davranır. Saldırgan çok sayıda sahte `installId` ile Firestore'u doldurabilir. İyileştirme: App Check,
   hız sınırı, IP başına kota.
2. Ücretsiz plan "1 alarm" sınırı **yalnızca istemcidedir**; sunucu cihaz başına 30'a izin verir.
3. Push **receipt**'leri kontrol edilmez.
4. Zamanlayıcı en sık dakikada bir çalışır; alarm gecikmesi birkaç dakika olabilir.
5. Hesap yok: uygulama silinirse alarmlar da gider; aynı kullanıcının iki cihazı ayrı sayılır.
6. Kasa toplamı alarmı sunucuya gitmez (değer yalnızca cihazda bilinir).

---

## 7. Kaynak kod rehberi

### 7.1 İstemci

| Dosya | Ne işe yarar |
| --- | --- |
| `app/alarm.tsx` | Alarm ekranı: kurma formu, bekleyen/tetiklenen listeler, düzenleme, silme |
| `app/_layout.tsx` | Kök yerleşim; bildirime dokunma dinleyicisi (`onOpen` → `router.push`) |
| `src/providers/AppProviders.tsx` | Context sağlayıcı ağacı; `AlarmProvider` buradadır |
| `src/viewmodels/alarm/AlarmProvider.tsx` | **Merkez.** Durum, izin, yerel kontrol, sunucu eşitleme |
| `src/viewmodels/alarm/useAlarmPrices.ts` | Alarmların izlediği güncel fiyatları toplar |
| `src/data/repositories/alarmRepository.ts` | Saklama + `due` (koşul kontrolü) + `markTriggered` |
| `src/data/datasources/notificationsDatasource.ts` | `expo-notifications` sarmalayıcısı: izin, token, yerel bildirim, dokunma |
| `src/data/datasources/alarmSyncDatasource.ts` | `installId` üretimi ve `syncAlarms`'a HTTP |
| `src/core/constants/alarmAssets.ts` | Alarm kurulabilen varlıklar, fiyat okuma, metin yardımcıları |
| `src/core/constants/premium.ts` | `FREE_ALARM_LIMIT` ve Pro kapıları |
| `src/core/storage/storage.ts` | `AsyncStorage` için tip güvenli `storageGet/Set/Remove` |
| `app.json`, `app.config.js` | Eklentiler, uzak bildirim, `google-services.json` koşullu ekleme |
| `plugins/withAppDisplayName.js` | Görünen adı ("Altın Kasam") iOS/Android için geri verir (bkz. bölüm 10) |
| `eas.json` | Build profilleri ve ortam eşlemesi |

### 7.2 Sunucu

| Dosya | Ne işe yarar |
| --- | --- |
| `firebase/functions/src/index.ts` | `syncAlarms`, `checkAlarms`, `cleanupAlarms` |
| `firebase/firestore.rules` | İstemci erişimi kapalı |
| `firebase/firebase.json` | Hosting + Firestore + Functions yapılandırması |
| `app/api/alarm-values+api.ts` | Gizli anahtarlı fiyat ucu |
| `src/server/hasfiyatPrices.ts` | Hasfiyat istemcisi, önbellek, hata geri çekilmesi |
| `src/core/constants/hasfiyatPriceMap.ts` | Hasfiyat kalem adları → alarm kimlikleri (uygulama ve sunucu **ortak** kullanır) |
| `src/core/constants/hasfiyatCache.ts` | Önbellek süreleri ve başlıkları |

### 7.3 Katmanlar (MVVM + Repository)

```
widgets (UI)  ─▶  viewmodels (Provider/hook)  ─▶  data/repositories  ─▶  data/datasources
 app/alarm.tsx     AlarmProvider                   alarmRepository        notifications, sync
```

Kural: UI doğrudan `AsyncStorage` ya da `fetch` çağırmaz. Böylece test ve değişiklik kolaylaşır
(ör. `notificationsDatasource` yerine sahte bir sürüm koymak).

### 7.4 Okunması gereken üç kod parçası

**a) Geç yüklenen native modül** (`notificationsDatasource.ts`)

```ts
let handle: NotificationsModule | null | undefined;
function load() {
  if (handle !== undefined) return handle;          // önbellek (null da bir sonuçtur)
  if (Platform.OS === 'web') return (handle = null);
  try { handle = require('expo-notifications'); /* handler kur */ } catch { handle = null; }
  return handle;
}
```
`undefined` = "henüz denenmedi", `null` = "yok". Üç durumlu önbellek deseni.

**b) Durum eşitleme** (`AlarmProvider.tsx` → `syncServer`)

```ts
const signature = JSON.stringify(payload.map(a => [a.id, a.direction, a.target]));
if (signature === lastSynced.current) return null;   // değişmediyse ağa gitme
const token = await notificationsDatasource.getPushToken();
if (!token) return null;                              // izin yok → yerel mod
const result = await alarmSyncDatasource.sync(token, payload);
```

**c) Zamanlanmış karar** (`checkAlarms`): `intervalFor(gapPercent)` ile kota tasarrufu.

---

## 8. React Native kavramları bu projede nerede?

| Kavram | Bu projedeki yeri | Dikkat |
| --- | --- | --- |
| `useState` | `AlarmProvider`: `alarms`, `ready` | Durum değişince yeniden çizim |
| `useEffect` | Açılış okuması, eşitleme, yerel kontrol | Bağımlılık dizisi ve temizleme (`cancelled` bayrağı) |
| `useRef` | `inFlight`, `lastSynced` | Çizimi tetiklemeyen değişken; **çizim sırasında okunmaz** (React Compiler kuralı) |
| `useCallback` / `useMemo` | `syncServer`, `value` | Bağlam değeri her çizimde yeniden oluşmasın |
| Context + Provider | `AlarmContext`, `useAlarms()` | Prop drilling'i önler; sağlayıcı dışında kullanım hata atar |
| Custom hook | `useAlarmPrices`, `useAlarms` | Mantığı UI'dan ayırır |
| `AppState` | Fiyat yoklaması arka planda durur | Pil ve kota |
| `AsyncStorage` | Alarmlar, `installId` | Şifresiz; hassas veri için `expo-secure-store` |
| Expo Router | `app/alarm.tsx`, `router.push` | Dosya = rota; `useLocalSearchParams` |
| `Platform.OS` | Web'de `window.alert`, Android kanal | Çapraz platform dalları |
| Config plugin | `expo-notifications`, `withAppDisplayName` | Native ayarı JS ile |
| API Route | `alarm-values+api.ts` | Sunucuda çalışır, `process.env` sunucu değişkenleri |
| `EXPO_PUBLIC_*` | `EXPO_PUBLIC_ALARM_SYNC_URL` | Derleme zamanı gömülür |
| EAS | build, credentials, env, deploy | Bulutta imza ve derleme |
| React Compiler lint | `set-state-in-effect`, ref kuralları | Effect gövdesinde senkron `setState` yok |

### 8.1 Sık yapılan hatalar (bu projede de karşılaşıldı)

- `useEffect` içinde senkron `setState` → React Compiler lint hatası. Çözüm: async sonrasında çağırmak
  ya da durumu başka şekilde türetmek.
- Bağımlılık dizisini unutmak → bayat kapanış (stale closure).
- Temizleme yok → kaldırılmış bileşende `setState`, bellek sızıntısı.
- `Date.now()`'ı çizim sırasında kullanmak → saf olmayan çizim.

---

## 9. Ekip çalışmasında dikkat edilecekler

### 9.1 Sırlar

- Anahtarı **asla** git'e koymayın. Bu projede `.gitignore`: `google-services.json`, `*.p8`, `*.jks`,
  `*-firebase-adminsdk-*.json`, `credentials/`.
- Bir sır sohbete, ekran görüntüsüne ya da PR'a düştüyse **sızmış sayılır**: yenileyin (rotation).
- Ortam başına ayrı değer: `development`, `preview`, `production`.
- Sırları parola yöneticisinde tutun, kişisel Masaüstü'nde değil.

### 9.2 Geriye dönük uyumluluk (en çok unutulan konu)

Mobil uygulamalar **eski sürümlerle** yaşar: kullanıcı güncellemeyebilir. `syncAlarms`'a gelen
istek biçimi değişirse eski sürümler bozulur. Kurallar:

- Alan ekleyin, mevcut alanın anlamını değiştirmeyin; sunucu eksik alanı tolere etsin.
- Sunucuyu **önce**, uygulamayı **sonra** yayımlayın.
- Gerekirse API sürümü (`/v2/…`) ya da `minSupportedVersion` kontrolü.
- Burada `noun` değerinin sunucuda `NOUN_TITLE[alarm.noun] ?? 'Fiyat'` ile okunması bir örnek:
  bilinmeyen değer çökmeye değil varsayılana düşer.

### 9.3 Native ve OTA ayrımı

- JS değişikliği: OTA (EAS Update) ile yayılabilir.
- Native değişiklik (yeni eklenti, entitlement, `google-services.json`): **yeni mağaza build'i** gerekir.
  Bu ayrımı sürüm planına yazın; yanlış varsayım "düzelttim ama kullanıcıya ulaşmadı" sonucunu doğurur.

### 9.4 Ortamlar ve yapılandırma

- `.env.local` EAS bulut build'ine **gitmez**. Build'e gereken değişkenler EAS'ta tanımlanmalı.
- Değişken ekledikten sonra yeniden yayımlayın/derleyin; Expo Hosting yayınları **değişmezdir**.
- `eas.json` profilleri ile `environment` eşlemesini belgeleyin.

### 9.5 Kod gözden geçirme kontrol listesi (bildirim/alarm değişikliği için)

- [ ] Yeni istek alanı eski sürümlerle uyumlu mu?
- [ ] Idempotent mi (aynı istek iki kez gelirse ne olur)?
- [ ] "Önce işaretle sonra gönder" sırası korunmuş mu?
- [ ] İzin reddi, token yokluğu, ağ hatası yolları test edildi mi?
- [ ] Sır/anahtar kod ya da günlükte var mı?
- [ ] Günlükte kişisel veri (token tamamı) basılıyor mu? (basmayın)
- [ ] Maliyet etkisi: Hasfiyat/Firestore/Functions çağrı sayısı değişiyor mu?
- [ ] Gizlilik politikası ve mağaza veri formu güncellendi mi?
- [ ] Android + iOS ikisinde denendi mi? Gerçek cihazda mı?
- [ ] Native yapılandırma değiştiyse build notu yazıldı mı?

### 9.6 Test stratejisi

| Katman | Nasıl |
| --- | --- |
| Saf mantık (`due`, `intervalFor`, `alarmValuesFromItems`) | Birim test (Jest) |
| Repository/datasource | Sahte `AsyncStorage` ve `fetch` ile |
| Cloud Function | Firebase Emulator (`functions` + `firestore`) |
| Uçtan uca | Gerçek cihaz + test alarmı; sunucuya elle `curl` ile alarm ekleyip bildirimi izleme |
| E2E otomasyon | Maestro / Detox (bildirim izni ve sistem UI'ı zordur) |

Bu projede uçtan uca test şöyle yapıldı: cihazın token'ı alınıp sunucuya fiyatı çoktan aşılmış bir
test alarmı eklendi; bir dakika içinde bildirim `dumpsys notification` ile doğrulandı.

### 9.7 Yayın, izleme ve olay yönetimi

- Cloud Functions günlükleri ve `checkAlarms` günlükleri ilk bakılacak yerdir.
- Bütçe uyarısı (Blaze) ve Hasfiyat kota izleme kurun.
- Kısa bir **runbook**: "Bildirim gelmiyor" → token var mı, Firestore'da belge var mı, `checkAlarms`
  çalışıyor mu, Expo ticket'ı ne diyor, FCM/APNs kimlik bilgisi geçerli mi?
- Özellik bayrağı (feature flag): sunucu alarmını uzaktan kapatabilmek için `EXPO_PUBLIC_ALARM_SYNC_URL`
  boşken tüm yol kapanır; bu bir "kill switch"tir (yalnızca yeni build'le).

### 9.8 Gizlilik ve mağaza

- Push token ve alarm verisi kişisel veri sayılabilir; KVKK aydınlatma metni, gizlilik politikası,
  App Store "App Privacy" ve Play "Data safety" formları güncellenmeli.
- Veri silme: uygulama silinirse sunucudaki kayıtlar 14 gün sonra temizlenir; kullanıcı talebi için bir silme uç noktası düşünün.

### 9.9 Ekip içi çalışma biçimi

- Katman kuralına uyun (UI → viewmodel → repository → datasource).
- `src/core/constants/hasfiyatPriceMap.ts` gibi **uygulama ve sunucunun paylaştığı** dosyalar iki tarafı birden
  etkiler; değişiklikte ikisini de test edin.
- Büyük değişiklikte kısa bir tasarım notu (ADR) yazın: "neden Expo Push, neden anonim cihaz kimliği".

---

## 10. Bu projede yaşanan hatalar ve dersleri

| Olay | Sebep | Ders |
| --- | --- | --- |
| `/api/alarm-values` sürekli `unauthorized` | `ALARM_SERVER_SECRET` `secret` görünürlüğüyle eklenmişti; Expo Hosting `secret`'ı sunucuya dağıtmıyor | Platformun görünürlük kurallarını belgeden okuyun; "ayarladım" ≠ "çalışıyor" |
| Aynı sorunun devamı | `eas env:update` bayrak eksikliğiyle **sessizce** başarısız oldu (çıktı yukarı kaymıştı) | Komut çıktısını doğrulayın (ör. `grep -c` ile değeri karşılaştırın) |
| Hata ayrımı yoktu | Anahtar yok ve anahtar yanlış aynı yanıtı veriyordu | Farklı hatalara farklı kod (`503` vs `401`) |
| iOS build "Configure Xcode project" aşamasında çöktü | Uygulama adındaki `ı`: EAS `AltnKasam`, prebuild `AltinKasam` üretiyordu | ASCII `name` kullanın, görünen adı eklentiyle geri verin |
| Release'te çökme riski | `expo-asset` zorunlu eş bağımlılık olarak eksikti | `expo-doctor` çalıştırın, uyarıları ciddiye alın |
| Build'de değişken yok | `.env.local` bulut build'ine gitmez | Gerekli değişkenleri EAS'a ekleyin |
| Servis hesabı JSON'u proje kökünde | İndirilen dosya git'ten korunmuyordu | `.gitignore` desenleri ekleyin, işiniz bitince taşıyın |
| Test sırasında token sohbete yazılmasın | Günlükteki token bir sırdır | Geçici günlüğü işiniz biter bitmez silin |
| Kapalıyken bildirim denemesi emülatörde başarısız | Emülatör kapanmıştı | Test altyapısını (cihaz bağlı mı) önce doğrulayın |

---

## 11. Mülakat soruları

Her soruda kısa bir "iyi cevap iskeleti" verilmiştir.

### 11.1 React Native / Expo

1. **React Native nasıl çalışır?** JS kodu bir motorda (Hermes) çalışır; yeni mimaride JSI ile
   native modüllerle doğrudan konuşur, Fabric ile UI ağacı native görünümlere eşlenir.
2. **Expo managed ile bare workflow farkı?** Bu projede CNG: `android/ios` üretilir, `app.json` ve
   config plugin'lerle yönetilir. Bare'de native klasörler elle düzenlenir.
3. **Config plugin nedir? Ne zaman yazarsınız?** Native proje dosyasını `prebuild` sırasında JS ile
   değiştiren eklenti. Örnek: Android `app_name`, iOS `CFBundleDisplayName` (`withAppDisplayName.js`).
4. **OTA güncelleme ile mağaza güncellemesi arasındaki fark?** JS/asset OTA ile; native kod,
   izin, entitlement mağaza build'iyle. Hangisinin gerektiğini bilmek sürüm planı için kritik.
5. **`useEffect` temizleme fonksiyonu neden önemli?** Abonelik/zamanlayıcıyı kaldırır; kaldırılmış
   bileşende `setState` ve bellek sızıntısını önler. (`cancelled` bayrağı örneği.)
6. **`useRef` ile `useState` farkı?** Ref çizimi tetiklemez, değişkeni çizimler arasında saklar.
   `lastSynced` ve `inFlight` bu yüzden ref.
7. **Context'in dezavantajı?** Değer değişince tüm tüketiciler yeniden çizilir. `useMemo` ile değer
   sabitlenir; sık değişen veriyi ayrı bağlama bölün (bu projede grafik ve fiyat bağlamları ayrı).
8. **AsyncStorage güvenli mi?** Hayır, şifresiz. Token/şifre için `expo-secure-store` (Keychain/Keystore).
9. **AppState ne işe yarar?** Uygulamanın ön/arka plan durumunu verir; arka planda yoklamayı durdurmak
   için kullanılır (pil + maliyet).
10. **Deep link ve bildirime dokunma nasıl yönetilir?** Soğuk açılış (`getLastNotificationResponseAsync`)
    ve çalışırken (`addNotificationResponseReceivedListener`) iki yol; yönlendirmeden önce yolu doğrulayın.
11. **FlatList neden ScrollView'dan iyi?** Sanallaştırma; yalnızca görünen satırlar çizilir.
12. **Yeni mimari (Fabric, TurboModules) ne getirir?** Köprüsüz (JSI) senkron çağrı, daha iyi başlangıç.

### 11.2 Bildirimler

13. **Yerel ve uzak bildirim arasındaki fark?** Üretici ve kapalıyken çalışma yeteneği (bölüm 2.1).
14. **Push token nedir, neden değişir?** İşletim sisteminin cihaz+uygulamaya verdiği adres; yeniden
    kurulum, yedekten geri yükleme, sürüm değişikliğiyle değişebilir. Sunucu geçersizlerini temizlemeli.
15. **Ön planda bildirim neden görünmez, nasıl göstertirsiniz?** `setNotificationHandler`.
16. **Android kanalı nedir?** Android 8+; sesi/önemi kullanıcı ayarlar; kimliği sonradan değiştirmeyin.
17. **Bildirim izni reddedilirse ne yaparsınız?** Zarif geri düşüş: yerel uyarı, Ayarlar'a yönlendirme, tekrar sormama.
18. **FCM ve APNs farkı?** Google/Apple servisleri; Expo Push ikisinin önünde ortak katman.
19. **Notification message ile data message?** Notification: sistem gösterir. Data-only: uygulamanın
    arka plan kodu çalışır (iOS'ta kısıtlı, Android'de güvenilirliği değişken).
20. **Bildirim teslimi garantili mi?** Hayır, en iyi çabadır; receipt'lerle ve yeniden deneme mantığıyla yönetilir.
21. **Aynı bildirimi iki kez göndermemek için ne yaparsınız?** İdempotent anahtar, "önce işaretle sonra gönder",
    istemci tarafı tekilleştirme (bölüm 2.7).

### 11.3 Mimari ve backend

22. **Neden tam liste eşitleme (state sync)?** Idempotent, basit, kayıp isteğe dayanıklı.
23. **Neden Firestore kuralları tamamen kapalı?** İstemci hiç erişmez; tüm yazma sunucudan, yetki yüzeyi küçük.
24. **Alarmları nasıl ölçeklendirirsiniz?** Her dakika tüm bekleyenleri okumak yerine: varlığa göre indeks,
    hedef aralıklarına göre sıralı sorgu (`target <= fiyat`), parçalı işleme, kuyruk (Pub/Sub, Cloud Tasks).
25. **`maxInstances: 1` neden?** Aynı anda iki zamanlayıcı çalışıp çift gönderim yapmasın.
26. **Hasfiyat kotasını nasıl koruduk?** Adaptif yoklama, piyasa saatleri, CDN önbelleği, hata geri çekilmesi.
27. **Race condition örneği ve çözümü?** Açılışta yerel kontrol ile sunucu bildirimi yarışı → `ready` bayrağı.
28. **Eventual consistency nerede var?** İstemci ve sunucu alarm listesi anlık aynı değil; eşitleme sonrası uzlaşır.
29. **Bir alarmı hem cihazda hem sunucuda tetiklemenin riski?** Çift bildirim; çözüm: tek doğruluk kaynağı
    belirleyip diğerini bastırmak (burada sunucu tetiklerse istemci `markTriggered`).

### 11.4 Güvenlik

30. **`EXPO_PUBLIC_` değişkenine sır koyar mısınız?** Hayır; pakete gömülür, tersine mühendislikle okunur.
31. **Herkese açık HTTP ucunu nasıl korursunuz?** Girdi doğrulama, hız sınırı, App Check/Auth, boyut sınırı.
32. **Sır sızarsa ne yaparsınız?** İptal et, yenile, kullanımı denetle, kaynağı kapat (rotation).
33. **Anonim kimlik (`installId`) bir güvenlik önlemi mi?** Hayır, taşıyıcı anahtar gibidir; tahmin edilemez
    olması tek korumadır.

### 11.5 Süreç ve takım

34. **OTA ile native değişiklik karışırsa ne olur?** Eski native sürümde yeni JS çöker; çalışma zamanı
    sürümü (`runtimeVersion`) ve uyumluluk kontrolü gerekir.
35. **Bir hata canlıda nasıl ayıklanır?** Günlük, metrik, uzaktan kapatma, geri alma planı, runbook.
36. **Bir özelliğin maliyetini nasıl tahmin edersiniz?** Çağrı başına birim maliyet × tetikleyici sıklığı ×
    kullanıcı sayısı; üst sınır ve gerçek ölçümü ayrı yazın.
37. **PR'da neleri kontrol edersiniz?** Bölüm 9.5 listesi.

### 11.6 Kod yazma / canlı kodlama

- `due()` fonksiyonunu yazın ve birim testini ekleyin.
- `intervalFor(gap)` için sınır değer testleri yazın.
- Bir `useEffect`'te yarış durumunu (stale response) `cancelled` bayrağıyla düzeltin.
- Bir alarm listesini kalıcılaştıran küçük bir repository yazın.

---

## 12. Alıştırmalar

1. **Yeni alarm türü:** "Günlük değişim %2'yi aşınca" alarmı ekleyin. Hangi dosyalar değişir (model,
   `alarmAssets`, `alarmRepository.due`, sunucu `checkAlarms`, bildirim metni, eski sürüm uyumluluğu)?
2. **Bildirim receipt'i:** Expo receipt uç noktasını sorgulayıp hatalı token'ları temizleyen ikinci bir
   zamanlanmış fonksiyon yazın.
3. **Hız sınırı:** `syncAlarms`'a IP başına dakikada N istek sınırı ekleyin.
4. **Kimlik:** Firebase Anonymous Auth ekleyin; `installId` yerine `uid` kullanın; Firestore kurallarını buna göre yazın.
5. **Test:** Firebase Emulator ile `checkAlarms` için birim test yazın (hedef aşıldı / aşılmadı / piyasa kapalı).
6. **Gözlemlenebilirlik:** Tetiklenen alarm sayısını ve push hata oranını bir metrik olarak yayımlayın.
7. **Flutter:** [Flutter belgesindeki](FIYAT_ALARMI_FLUTTER_KARSILIKLARI.md) iskeleti çalışır hale getirin.

---

## Sözlük

| Terim | Açıklama |
| --- | --- |
| APNs | Apple push servisi |
| FCM | Google push servisi (Firebase Cloud Messaging) |
| Token | Cihaz+uygulama push adresi |
| Entitlement | Uygulamanın sahip olduğu sistem yetkisi (iOS `aps-environment`) |
| Provisioning profile | iOS imza/yetki paketi |
| CNG | Native klasörlerin yapılandırmadan üretilmesi |
| OTA | Mağaza dışı JS güncellemesi |
| Idempotent | Aynı işlem tekrarlanınca sonucu değişmeyen |
| Rotation | Sırrı yenileme |
| TTL | Önbellek ömrü |
| SWR | stale-while-revalidate: eski yanıtı ver, arkada yenile |
