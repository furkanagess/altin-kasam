# Bildirim Sistemi

Altın Kasam'daki bütün bildirimler **cihazda üretilen yerel bildirimlerdir** (`expo-notifications`,
SDK 58). Sunucu taraflı push bildirimi yoktur: `app.json`'da eklenti
`"enableRemoteNotifications": false` ile kuruludur, cihazdan push token alınmaz ve hiçbir sunucuya
bildirim için veri gönderilmez.

Bu belge bildirimlerin nasıl üretildiğini, hangi koşulda tetiklendiğini, nerede saklandığını,
platformlar arasındaki farkları ve bilinen sınırları anlatır.

## 1. Bildirim türleri

| Tür | Tetikleyen | Ne zaman gelir | Uygulama kapalıyken | Dokununca açılan ekran |
| --- | --- | --- | --- | --- |
| Fiyat alarmı | `AlarmProvider` | Fiyat hedefe ulaştığı ilk güncellemede, anında | **Hayır** (yalnızca uygulama açıkken kontrol edilir) | `/` (Piyasa) |
| Ekonomik takvim hatırlatması | `EconomicCalendarRepository` | Açıklamadan 15 dk önce, işletim sistemi zamanlayıcısıyla | **Evet** | `/calendar` |
| Takip edilen haber kaynağı | `CommunityProvider` | Akış yenilenip takipten sonra yayımlanmış yeni haber bulunduğunda | **Hayır** | `/post/{id}` ya da `/community` (özet) |

Alarm türleri: altın çeşitleri, gram gümüş/platin/paladyum, kasanın toplam değeri ve altın/gümüş
rasyosu (`src/core/constants/alarmAssets.ts`).

## 2. Katmanlar ve dosyalar

```
app/_layout.tsx                      Bildirime dokunma → router.push(path)
src/data/datasources/
  notificationsDatasource.ts         expo-notifications sarmalayıcısı (tek giriş noktası)
src/viewmodels/
  alarm/AlarmProvider.tsx            Alarm kontrolü ve anlık bildirim
  alarm/useAlarmPrices.ts            Alarmın izlediği güncel değerler
  analysis/EconomicCalendarProvider.tsx   Hatırlatma aç/kapa, hata uyarısı
  community/CommunityProvider.tsx    Takip edilen kaynaktan yeni haber bildirimi
src/data/repositories/
  alarmRepository.ts                 Alarm kaydı, tetiklenme işareti, koşul hesabı
  economicCalendarRepository.ts      Hatırlatma kaydı, zamanlanmış bildirim kur/iptal
  sourceFollowRepository.ts          Takipler, bildirilmiş haber kimlikleri, "yeni haber" hesabı
src/core/constants/
  alarmAssets.ts                     Alarm varlıkları, değer biçimi ve metinler
  economicCalendar.ts                EVENT_REMINDER_LEAD_MINUTES = 15
  premium.ts                         FREE_ALARM_LIMIT = 1
```

Ekranlar (`app/alarm.tsx`, `app/calendar.tsx`, `app/sources.tsx` vb.) `expo-notifications`'ı hiç
içe aktarmaz; yalnızca sağlayıcıların (`useAlarms`, `useEconomicCalendar`,
`useCommunityViewModel`) fonksiyonlarını çağırır. Bildirim altyapısı değişirse yalnızca
`notificationsDatasource` değişir.

## 3. `notificationsDatasource`

### 3.1 Modülün geç yüklenmesi

`expo-notifications` içe aktarıldığı anda yerel (native) modülü ister. Modül web'de ve paket
eklenmeden önce alınmış development build'lerde yoktur; doğrudan `import` uygulamayı çökertir. Bu
yüzden modül ilk kullanımda `require` ile yüklenir:

- `Platform.OS === 'web'` → `null` (bildirim yok).
- `require` hata verirse → `null`; çağıranlar uygulama içi uyarıya düşer.
- Başarılıysa `setNotificationHandler` bir kez kurulur: uygulama **ön plandayken** gelen bildirim
  de banner, liste ve sesle gösterilir (`shouldShowBanner`, `shouldShowList`, `shouldPlaySound`;
  rozet yok).

Sonuç modül düzeyinde saklanır (`handle`); sonraki çağrılar yeniden yüklemez.

### 3.2 API

| Fonksiyon | Görevi | Dönüş |
| --- | --- | --- |
| `isAvailable()` | Modül yüklenebiliyor mu (web'de `false`) | `boolean` |
| `ensurePermission()` | Android'de kanalı oluşturur, izin yoksa ister | izin verildi mi |
| `present(title, body, path)` | Hemen gösterilen bildirim | gösterildi mi (izin yoksa `false`) |
| `scheduleAt(id, date, title, body, path)` | Belirli anda gösterilecek bildirim; aynı `id` eskisinin yerini alır | kuruldu mu (geçmiş an ya da izin yoksa `false`) |
| `cancel(id)` | Zamanlanmış bildirimi iptal eder | — |
| `onOpen(listener)` | Bildirime dokunulunca `data.path` ile çağrılır; dinlemeyi bırakan fonksiyon döner | `() => void` |

Bütün fonksiyonlar hataları yutar ve `false` döner. Bildirim gösterilemediğinde ne yapılacağına
çağıran karar verir.

### 3.3 Android kanalı

Tek kanal kullanılır: `price-alarms` ("Fiyat alarmları", önem `HIGH`). Kanal `ensurePermission`
içinde oluşturulur. Anlık bildirimlerde `trigger: { channelId }`, zamanlanmışlarda
`{ type: DATE, date, channelId }` verilir. Android 13 ve sonrasında izin istemi bir kanal varken
görünür; kanalın izinden önce kurulmasının nedeni budur.

> Takvim hatırlatmaları ve haber bildirimleri de bu kanaldan gider; Android'in bildirim
> ayarlarında hepsi "Fiyat alarmları" altında görünür (bkz. §9).

### 3.4 İzin akışı

İzin uygulama açılışında **istenmez**. İlk kez şu işlemlerden biri yapılınca istenir:

- alarm kurma (`AlarmProvider.addAlarm`),
- takvim hatırlatmasını açma (`EconomicCalendarRepository.toggleReminder`),
- haber kaynağını takip etme (`CommunityProvider.toggleFollow`).

İzin reddedilirse:

| İşlem | Davranış |
| --- | --- |
| Alarm | Alarm yine kaydedilir; tetiklenince uygulama içi `Alert` gösterilir. |
| Takvim hatırlatması | Kurulmaz (`ok: false`); "Hatırlatma kurulamadı… izni Ayarlar'dan açabilirsin" uyarısı çıkar. |
| Kaynak takibi | Takip kaydedilir (akış sıralaması çalışır); bildirim gelmez. |

`present` ve `scheduleAt` her çağrıda `getPermissionsAsync` ile izni yeniden kontrol eder. iOS
izinsiz isteği hatasız yuttuğu için bu kontrol olmadan çağıran, bildirimin gösterilmediğini
anlayamazdı.

### 3.5 Bildirime dokunma

Her bildirimin `content.data.path` alanında uygulama içi bir yol vardır (`/`, `/calendar`,
`/post/abc`). `app/_layout.tsx` açılışta bir kez:

```ts
useEffect(() => notificationsDatasource.onOpen((path) => router.push(path as Href)), []);
```

`onOpen` iki durumu karşılar:

1. Uygulama açıkken ya da arka plandayken dokunma: `addNotificationResponseReceivedListener`.
2. Uygulama bildirime dokunularak **soğuk açıldıysa**: `getLastNotificationResponseAsync` ile son
   yanıt bir kez işlenir.

Yalnızca `/` ile başlayan dizeler kabul edilir; dış adres ya da bozuk veri yok sayılır.

## 4. Fiyat alarmları

### 4.1 Veri

```ts
type PriceAlarm = {
  id: string;            // "alarm-<zaman>-<rastgele>"
  assetId: string;       // "ceyrek-22", "gumus-gram", "kasa-toplam", "altin-gumus-rasyosu"
  direction: 'above' | 'below';
  target: number;        // TRY; rasyoda birimsiz
  createdAt: string;
  triggeredAt?: string;  // doluysa bir daha bildirim gönderilmez
};
```

AsyncStorage anahtarı: `altin_kasam_alarms_v1`.

### 4.2 Kontrol döngüsü

```
MarketProvider (Hasfiyat REST, uygulama ön plandayken 10 sn'de bir)
   │ fiyatlar değişir
   ▼
useAlarmPrices() → { goldRates, quotes, portfolioValue (TRY), ratio }
   ▼
AlarmProvider useEffect([alarms, prices])
   ├─ alarmRepository.due(alarms, priceOf) → koşulu sağlayan bekleyen alarmlar
   ├─ inFlight kümesindekiler atlanır (aynı alarm için eşzamanlı ikinci tur olmasın)
   ├─ markTriggered(ids)  ← ÖNCE kalıcı işaret
   └─ her alarm için present(title, body, '/')
         └─ false ise: native'de Alert.alert, web'de window.alert
```

- **Koşul:** `above` için `fiyat >= hedef`, `below` için `fiyat <= hedef`. Altın ve metallerde
  **alış (bozdurma) fiyatı** kullanılır; kasa değeri gösterim para biriminden bağımsız olarak TRY
  hesaplanır; rasyo kaynağın verdiği orandır (yoksa gram altın / gram gümüş).
- **Tek sefer:** Alarm bildirim gönderilmeden önce `triggeredAt` ile kaydedilir. Uygulama bildirim
  sırasında kapansa bile alarm ikinci kez çalmaz. Kayıt başarısız olursa alarm bekleyen kalır ve bir
  sonraki fiyat güncellemesinde yeniden denenir.
- **Metin:** `alarmMessage()`. Örnek başlık "Çeyrek Altın ₺10.700,00 üstüne çıktı", gövde
  "Güncel alış ₺10.712,40." Kasa değeri ve rasyo için metinler `alarmValueNoun` ve
  `formatAlarmValue` ile uyarlanır.
- **Sınır:** Ücretsiz planda aynı anda `FREE_ALARM_LIMIT` (1) bekleyen alarm. Tetiklenmiş alarmlar
  sınıra sayılmaz. Sınır doluysa `addAlarm` ödeme ekranını açar.

### 4.3 Uygulama kapalıyken (Firebase)

Yerel kontrol yalnızca uygulama çalışırken yapılır. `EXPO_PUBLIC_ALARM_SYNC_URL` tanımlıysa ve
bildirim izni varsa bekleyen alarmlar ayrıca Firebase'e yazılır ve uygulama kapalıyken oradan Expo
Push ile bildirilir. Kurulum ve mimari: `docs/FIREBASE_ALARM_KURULUM.md`.

- Kasa toplamı alarmı sunucuya gitmez (değer yalnızca cihazda bilinir); yalnızca açıkken çalışır.
- Sunucuda tetiklenen alarm, uygulama açılırken "tetiklendi" işaretlenir ve tekrar bildirilmez
  (`AlarmProvider`: açılışta eşitleme bitmeden yerel kontrol başlamaz).
- Adres ya da izin yoksa her şey eskisi gibi yalnızca cihazda çalışır.

## 5. Ekonomik takvim hatırlatmaları

### 5.1 Akış

```
Takvim satırındaki zil (yalnızca Pro + bildirim destekli platform)
   ▼
EconomicCalendarProvider.toggleReminder(event)
   ▼
EconomicCalendarRepository.toggleReminder(event)
   ├─ kayıtlıysa: cancel("economic-event-<id>") + listeden çıkar
   └─ değilse:
        ensurePermission()            → yoksa ok:false
        remindAt = event.at − 15 dk
        scheduleAt("economic-event-<id>", remindAt,
                   "ABD · Fed faiz kararı",
                   "15 dakika sonra açıklanacak · Aralık verisi",
                   "/calendar")       → geçmiş an / izin yok → ok:false
        listeye ekle (altin_kasam_event_reminders_v1)
```

- Bildirim **işletim sistemi tarafından zamanlanır**; uygulama kapalı ya da telefon yeniden
  başlatılmış olsa da gelir.
- Bildirim kimliği olay kimliğinden türetilir (`economic-event-tr-ppk-2026-12`); aynı olay için
  yeniden kurma eskisinin yerini alır, çift bildirim olmaz.
- `listReminders(upcoming)` her takvim yüklemesinde artık yaklaşan listesinde olmayan (geçmiş)
  olayların kimliklerini kayıttan temizler.
- Saatler sunucudan saat dilimiyle gelir (`2026-12-10T14:00:00+03:00`); bildirim cihaz saat
  diliminden bağımsız olarak doğru anda çalar.

### 5.2 Görünürlük

Zil düğmesi `remindersAvailable && isPremium` iken gösterilir. Web'de ve `expo-notifications`
içermeyen eski development build'lerde gizlidir. Takvim ekranının alt notlarında "Zil simgesine
dokunursan açıklamadan 15 dakika önce bildirim gelir." açıklaması da aynı koşulla görünür.

## 6. Takip edilen haber kaynakları

### 6.1 Veri

| Anahtar | İçerik |
| --- | --- |
| `altin_kasam_followed_sources_v1` | `{ name, since }[]`. `since` takibe başlanan an; öncesindeki haberler bildirilmez. |
| `altin_kasam_notified_news_v1` | Bildirimi gönderilmiş haber kimlikleri (en çok 300) |

### 6.2 Akış

```
CommunityProvider
  ├─ açılışta takipler + bildirilmiş kimlikler yüklenir (yüklenene kadar kontrol yapılmaz)
  ├─ takip varken uygulama ön plandayken 10 dk'da bir akış yenilenir (FOLLOW_POLL_INTERVAL_MS)
  └─ useEffect([postsByMetal, follows]):
        fresh = sourceFollowRepository.fresh(posts, follows, notified)
              // haber kaynağı takip ediliyor, yayım > since, daha önce bildirilmemiş
        kimlikler önce bellekte ve kalıcı olarak "bildirildi" işaretlenir
        kaynak başına:
          ≤ 2 haber → her biri için present(kaynak, başlık, "/post/<id>")
          > 2 haber → tek özet: present(kaynak, "5 yeni haber · <ilk başlık>", "/community")
```

Kaynak, haberin yayıncısıdır (`post.author`; yalnızca haber türündeki gönderiler). Bluesky
gönderileri takip edilemez.

## 7. Platform farkları

| | iOS | Android | Web |
| --- | --- | --- | --- |
| Yerel bildirim | Var | Var (kanal `price-alarms`) | Yok |
| İzin | İlk ilgili işlemde sistem istemi | Android 13+ istem; daha eskide varsayılan açık | — |
| Ön planda bildirim | Banner + liste + ses | Aynı | — |
| Alarm tetiklenince | Bildirim; izin yoksa `Alert` | Aynı | `window.alert` |
| Takvim zili | Pro'da görünür | Pro'da görünür | Gizli |
| Haber bildirimi | Var | Var | Yok (sessizce atlanır) |

`expo-notifications` yerel kod içerir. Paket eklendikten sonra alınmamış eski bir development
build'de modül yoktur; bu durumda uygulama web gibi davranır (bildirim yok, uyarıya düşer). Yeni
derleme: `npx expo run:ios|android` ya da `eas build --profile preview`.

## 8. Saklanan veriler ve gizlilik

Bildirim verisi cihazdadır (AsyncStorage / web'de localStorage): alarmlar, hatırlatma kimlikleri,
takipler ve bildirilmiş haber kimlikleri. **Tek istisna:** sunucu alarmı açıksa bekleyen fiyat
alarmları (varlık, yön, hedef), Expo push token'ı ve rastgele bir cihaz kimliği Firebase'e yazılır;
tetiklenip bildirilen kayıtlar 14 gün sonra silinir. Hesap, ad ya da e-posta tutulmaz. Gizlilik politikası taslağı (`docs/legal/gizlilik-politikasi.md` §2) bu durumu
anlatır.

## 9. Bilinen sınırlar ve iyileştirme fikirleri

1. **Sunucu alarmı kurulmadıkça alarmlar uygulama kapalıyken çalışmaz.** Kurulum için
   `docs/FIREBASE_ALARM_KURULUM.md`. Sunucu tarafında Pro sınırı denetlenmez (yalnızca cihaz
   başına 30 alarm üst sınırı vardır).
2. **Takvim saati değişirse hatırlatma güncellenmez.** Kurum olayın saatini sonradan değiştirirse
   zamanlanmış bildirim eski saatte kalır. Çözüm: `listReminders` içinde kayıtlı her olay için
   `scheduleAt` yeniden çağrılabilir (aynı kimlik eskisinin yerini alır).
3. **Tek Android kanalı.** Takvim ve haber bildirimleri "Fiyat alarmları" kanalında görünür.
   Kullanıcının türleri ayrı ayrı kapatabilmesi için `price-alarms`, `calendar-reminders` ve
   `followed-news` kanalları açılıp `present` / `scheduleAt` çağrılarına kanal parametresi
   eklenebilir. Mevcut kanal kimliği değiştirilmemeli; kullanıcının kanal ayarı kimliğe bağlıdır.
4. **Haber bildirimleri yalnızca uygulama açıkken.** Akış ön planda yenilenir; uygulama kapalıyken
   yayımlanan haber, bir sonraki açılışta bildirilir.
5. **Alarm bildiriminin hedefi sabit.** Dokununca her zaman Piyasa ekranı (`/`) açılır. Alarmın
   varlığına göre `/gold/<id>`, `/metal/<symbol>`, `/portfolio` ya da `/analytics` açılabilir.

## 10. Test

| Senaryo | Nasıl |
| --- | --- |
| Alarm | Ekrandan "Yükselince" ve hedefi güncel değerin hemen üstünde (+%1 kısayolu) kur, fiyatın oraya çıkmasını bekle. Hızlı test: `altin_kasam_alarms_v1` kaydına hedefi güncel fiyatın **altında** olan bir `above` alarm yaz (ekran buna izin vermez); ilk fiyat güncellemesinde (≤ 30 sn) çalar. |
| Takvim | Yaklaşan bir olayın zilini aç. Hızlı test için `EVENT_REMINDER_LEAD_MINUTES` geçici olarak büyütülebilir ya da olayın `at` değeri birkaç dakika sonrasına alınarak `toggleReminder` çağrılır. |
| Haber | Bugün haberi olan bir kaynağı takip et; `altin_kasam_notified_news_v1` kaydını silip akışı yenile. Yalnızca takipten **sonra** yayımlanan haberler bildirilir. |
| Dokunma | Bildirime uygulama açıkken, arka plandayken ve uygulama tamamen kapalıyken dokun; üçünde de ilgili ekran açılmalı. |
| İzin reddi | Ayarlar'dan bildirimi kapat; alarm tetiklenince `Alert`, takvimde uyarı mesajı görülmeli. |

iOS simülatörü ve Android emülatörü yerel bildirimleri gösterir; Expo Go yerine projenin
development build'i kullanılmalıdır.

## 11. Yeni bir bildirim türü eklemek

1. Tetikleyiciyi ilgili sağlayıcıya ya da depoya koy. Ekranlardan doğrudan bildirim gönderme.
2. İzni kullanıcı eylemi sırasında iste (`ensurePermission`), açılışta değil.
3. Anlık bildirim için `present(title, body, path)`, ileri bir an için `scheduleAt(id, date, …)`
   kullan. `id`'yi kaynağın kimliğinden türet ki yeniden kurmak çift bildirim üretmesin.
4. Bildirimi göndermeden önce "gönderildi" durumunu kalıcı kaydet (alarm ve haber akışındaki gibi).
   Böylece uygulama kapanıp açılınca aynı bildirim tekrar gitmez.
5. `present` `false` dönerse ne olacağına karar ver: uygulama içi uyarı mı, sessiz geçiş mi?
6. `path` uygulama içi bir rota olmalı (`/` ile başlar); `app/_layout.tsx` onu `router.push` eder.
7. Gizlilik metnini ve bu belgeyi güncelle.
