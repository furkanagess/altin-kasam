# Altın Kasam

Canlı altın ve gümüş fiyatları, sanal altın portföyü ve altın/gümüş odaklı topluluk feed’i sunan React Native (Expo) uygulaması.

## Mimari

- **MVVM** — Screen (View) → Provider ViewModel → Repository / Datasource
- **Provider** state management (`Market`, `Portfolio`, `Community`)
- **Atomic widgets** — `atoms` / `molecules` / `organisms`
- Tema ayrımı: `src/core/theme` (`colors`, `paddings`, `spacing`, `typography`, `radii`)
- Domain sabitleri: `src/core/constants` (altın formları, hashtag’ler)

## Özellikler

1. **Piyasa** — Gram altın ve gümüş; canlı fiyat + grafik
2. **Kasam** (portföy) — 14/18/22/24 ayar, çeyrek/yarım/tam/reşat/gram ekleme; canlı valuation & P&L. Toplam varlık grafiği emtia grafiğiyle aynı bileşeni kullanır (`PortfolioChartCard`): kasanın bugünkü içeriği gram altın geçmişiyle ölçeklenir (`portfolioRepository.valueSeries`, `usePortfolioChart`). Kasam sekmesi (`app/(tabs)/portfolio.tsx`) en üstte kısa yatırım hedefi şeridini, toplam varlık grafiğini, toplam (maliyete göre) ve günlük (dünkü kapanışa göre; bugün alınanlar alış fiyatına göre) kâr/zararı, maliyet, 24 ayar gram karşılığı özetini, ortalama maliyetli varlık listesini ve ürün türlerine göre dağılımı (adet / gram) gösterir.
3. **Topluluk** — `#Altın`, `#XAUUSD` vb. hashtag’lere göre gerçek akış: yalnızca bugün (yerel saatle gece yarısından itibaren) paylaşılan Bluesky gönderileri (anahtarsız arama) + yayıncı RSS/Atom akışları (Investing.com Türkiye, TRT Haber, Hürriyet, Dünya, AA, Bloomberg HT; liste `PUBLISHER_FEEDS`). Topluluk ekranında metal (altın/gümüş) ve tür (haber/gönderi) filtresi var; gün değişince akış kendiliğinden yenilenir. Yalnızca altın/gümüşten bahseden içerik alınır; tekrarlar ve aynı hesabın art arda paylaşımları elenir; her içerik kaynağına bağlantıyla gösterilir. Google Haberler RSS'i yalnızca kişisel, ticari olmayan kullanıma açık olduğundan kaynak olarak kullanılmaz. Haber detayında yalnızca yayıncının paylaşım önizlemesi (`og:description`, `app/api/article+api.ts`) gösterilir; haber metni kopyalanmaz, tamamı kaynağında okunur.

> Altın (gram, ayar, çeyrek/yarım/tam/reşat/cumhuriyet) ve gümüş fiyatları uygulama ön plandayken 10 saniyede bir [Hasfiyat API](https://altinapi.hasfiyat.com/docs)'den (Harem kaynağı) çekilir (`HasfiyatMarketDatasource`). Hasfiyat anahtarı gizlidir; uygulama doğrudan Hasfiyat'a değil kendi sunucu ucuna (`app/api/prices+api.ts`, Expo Router API route) gider, anahtar yalnızca orada `HASFIYAT_API_KEY` ortam değişkeninden okunur ve uç yanıtı 10 saniye önbellekte tutar. Geliştirmede anahtar `.env.local`'a yazılır, uç Metro'da çalışır. Üretimde sunucu `eas deploy` ile EAS Hosting'e yüklenir, anahtar EAS ortam değişkeni olarak tanımlanır ve native build'de `expo-router` eklentisinin `origin` ayarı bu adrese bağlanır (ayrıntı: [API routes](https://docs.expo.dev/router/web/api-routes/)). Hasfiyat fiyatların tek kaynağıdır (Trunçgil ticari kullanım için kurumsal plan istediğinden kaldırıldı): uca ulaşılamazsa son fiyat "Eski veri" olarak kalır; Harem'de olmayan 18 ayar ve Reşat listede gösterilmez, kasada gram fiyatından yaklaşık değerlenir. Metal grafikleri Hasfiyat'ın Harem geçmişinden çizilir (`ChartHistoryDatasource` → `HasfiyatMetalHistoryDatasource`, uç `app/api/history+api.ts`): altın `KÜLÇE ALTIN`, gümüş `GÜMÜŞ TL` (TL/gram), platin ve paladyum `PLATİN ONS` / `PALADYUM ONS` aynı anın `USD/TL` değeriyle gram TL'ye çevrilir; dolar/euro görünümünde her nokta o anın kuruyla dönüştürülür. 1G–1A saatlik barlarla (Harem son 45 günü saklar), 3A–1Y günlük barlarla çizilir; günlük geçmiş 4 Ekim 2026'dan başladığı için uzun periyotlar şimdilik o tarihten başlar. Seriler periyot/para birimi değişince ve 5 dakikada bir çekilir, son nokta canlı fiyatla güncellenir; geçmişe ulaşılamazsa cihazda biriken örnekler kullanılır. Binance kaldırıldı (ticari kullanım yazılı izne tabi).

## Haftalık analiz

Analiz sekmesinde (`app/(tabs)/analytics.tsx`) Altın/Gümüş rasyosu, en güncel analiz kartı ve bir önceki hafta (ikisi yalnızca Pro), daha eski haftaların analizi (ücretsiz); dokununca tamamı (`app/analysis/[id].tsx`); önceki haftalar sekmede ve analiz ekranının altında tarihleriyle listelenir. İçerik uygulama paketinde değildir: `EXPO_PUBLIC_WEEKLY_ANALYSIS_URL` adresindeki herkese açık JSON dosyasından okunur (`RemoteWeeklyAnalysisDatasource`, 10 dk önbellek). Adres tanımlı değilse aynı dosya sunucunun `/api/weekly` ucundan okunur (yerel geliştirmede hemen; canlıda sunucu yeniden yayımlanınca güncellenir). Eksik ya da bozuk kayıt atlanır; liste boşsa Analiz sekmesindeki bölüm hiç gösterilmez.

Dosya Firebase Hosting'de durur (`firebase/`; `firebase.json` JSON'a CORS ve 5 dk önbellek başlığı ekler). Her hafta:

1. `firebase/public/weekly-analyses.json` dosyasının **başına** yeni bir kayıt ekle (biçim mevcut kayıtlarla aynı: `id` ör. `2026-w47`, `weekStart` pazartesi `YYYY-AA-GG`, `publishedAt`, `outlook` için `direction` `up` / `down` / `neutral`, `levels` birim başına `{ "label": "Gram gümüş", "support": "₺80", "resistance": "₺84" }`, `sections`).
2. `npm run weekly:deploy` — önce dosyayı denetler (`scripts/check-weekly-analyses.mjs`; hata varsa yüklemez), sonra Firebase'e yükler. Yalnızca denetim: `npm run weekly:check`.
3. Uygulamalar yeni haftayı en geç ~15 dakika içinde (5 dk sunucu + 10 dk uygulama önbelleği) görür.

İlk kurulum (bir kez): Firebase konsolunda proje aç, `cd firebase && npx firebase-tools login && npx firebase-tools use --add` (projeyi seç), `npm run weekly:deploy`, ardından `EXPO_PUBLIC_WEEKLY_ANALYSIS_URL=https://<proje-id>.web.app/weekly-analyses.json` değerini `.env.local`'a ve EAS ortam değişkenlerine ekle.

## Ekonomik takvim

Analiz sekmesinde son açıklananlar ve yaklaşan Fed ve TCMB faiz kararları ile ABD (TÜFE, tarım dışı istihdam) ve TÜİK enflasyon açıklamaları; tamamı olası etki notlarıyla `app/calendar.tsx` ekranında. Elle tutulan tarih yoktur: sunucu ucu (`app/api/calendar+api.ts`) takvimi resmî kaynaklardan derler (`src/server/economicCalendarSchedule.ts`, 6 saat önbellek): Fed FOMC takvim sayfası, BLS yayın günleri FRED `release/dates` üzerinden (BLS sayfası sunucu isteklerini engeller; FRED yalnızca yaklaşan ilk yayını bilir), TCMB "Takvim" sayfası, TÜİK Ulusal Veri Yayımlama Takvimi yıllık listesi. Saatler Türkiye saatine yaz saati dahil çevrilir. Kurum henüz duyurmadıysa (ör. TÜİK 2027) olay listede yoktur; uca ulaşılamazsa uygulama "Takvim alınamadı" gösterir.

Geçmiş olayların açıklanan değerleri: Fed faizi, ABD TÜFE ve istihdam FRED'den (`FRED_API_KEY`), TCMB faizi anahtarsız TCMB "1 Hafta Repo" sayfasından, TÜİK TÜFE TCMB EVDS'den (`EVDS_API_KEY`, seri `TP.TUKFIY2025.GENEL`); anahtar yoksa ilgili sonuç "Sonuç bekleniyor" görünür. **Beklentiler** (`src/server/economicExpectations.ts`, 6 saat önbellek; **ticari kullanım izni gerektiği için varsayılan kapalı**, bkz. `src/server/dataLicenses.ts`): TCMB faiz kararı ve TÜİK aylık TÜFE için TCMB Piyasa Katılımcıları Anketi (EVDS `bie_pkauo`; anket, aynı ay toplantı varsa ondan önce yayımlanır, "ilk / ikinci / üçüncü toplantı" anket ayından itibaren sayılır), ABD TÜFE için Cleveland Fed anlık tahmini (anahtarsız; model tahmini). Açıklanan değer aynı ölçüde karşılaştırılır: beklentinin üstünde / altında / uyumlu (faizde ±0,25 puan, TR aylık TÜFE'de ±0,1 puan, ABD'de bir ondalıkta eşitlik); rapor ekranında "BEKLENTİ" bölümü ve sürpriz yorumu çıkar. Fed kararı ve tarım dışı istihdam için ücretsiz konsensüs kaynağı olmadığından beklenti gösterilmez. Son 21 günün olayları "Son açıklananlar" altında kalır. Uygulama takvimi açılışta, açıkken 5 dakikada bir, ön plana dönüşte ve sıradaki olayın saatinden 1 dakika sonra kendiliğinden yeniler (`EconomicCalendarProvider`); açıklanan sonuç ve rapor rozeti kullanıcı yenilemeden düşer. Açıklanan olaya dokununca rapor ekranı açılır (`app/economic-event/[id].tsx`, uç `app/api/calendar-report+api.ts`): tek cümlelik özet, altın ve gümüş için anlamı (kurallara dayalı, `economicReportRepository`), açıklamadan sonraki 24 saatte altın ve gümüş değişimi (ABD olaylarında USD, Türkiye olaylarında TL), Fed kararlarında resmî metinden ton (sıkı/gevşek/dengeli), oy dağılımı ve paragraflar (TCMB kararlarında yalnızca `TCMB_COMMERCIAL_PERMISSION=1` iken; izin yoksa duyuruya bağlantı verilir); resmî kaynak uygulama içinde açılır. TÜİK ve BLS metinleri sunucudan okunamadığı için bunlarda yalnızca bağlantı verilir. **Pro:** yaklaşan takvim, hatırlatmalar ve raporlar Pro'ya dahildir; ücretsiz kullanıcı son açıklanan sonuçları görür. Zil düğmesi açıklamadan 15 dakika önce yerel bildirim kurar (`notificationsDatasource.scheduleAt`); uygulama kapalıyken de çalışır, web'de gizlidir.

## Yatırım hedefi

İlk açılışta (`app/onboarding.tsx`) kullanıcıdan aylık veya yıllık bir **gram** hedefi istenir; atlanabilir. İlerleme Kasam ekranındaki hedef kartında izlenir: dönem (yerel saatle ay/yıl) içinde kasaya eklenen altının 24 ayar gram karşılığı (`gramGoldEquivalent`: çeyrek ≈ 1,61 g, 10 gr 22 ayar bilezik ≈ 9,21 g), kalan gram ve bugünkü satış fiyatıyla tahmini maliyeti, kalan gün ve geçen süreye göre plandan önde/geride olma. Hedef `app/goal.tsx` üzerinden düzenlenir veya kaldırılır; veriler cihazda saklanır (`goalRepository`).

## Topluluk beklentisi (Pro)

Topluluk ekranındaki kart, bugünün altın ve gümüş içeriklerinin tonunu (olumlu / olumsuz / nötr) ve bu tondan türetilen ibreli göstergeyi (Düşüş yönlü · Yatay · Yükseliş yönlü; ibre gücü gösterir, `STRONG_SIGNAL_THRESHOLD`) küçük bir satırda gösterir. Pro olmayan kullanıcı gerçek sonucu bulanık görür (`PremiumBlur`, `expo-blur`); Altın ve Gümüş hücreleri detay ekranını (`app/insight.tsx`) ilgili sekmede açar; üstteki Altın | Gümüş sekmeleri (`TopTabs`) arasında geçilir, her sekme dağılımı, otomatik özeti, gündem konularını ve “Yükseliş yönlü başlıklar” / “Düşüş yönlü başlıklar” kartlarını (yön başına en fazla `MAX_DIRECTIONAL_HEADLINES`) listeler. Analiz cihaz üzerinde, kurallara dayalı yapılır (`insightRepository`, sözlük `src/core/constants/insights.ts`): başlıklardaki yön ifadeleri metalden bahseden cümle parçalarında sayılır, haberler gönderilerden ağır basar. Serbest metinli (LLM) özet için anahtar uygulamaya gömülemeyeceğinden aynı imza arkasına sunucu tarafında bir model bağlanmalıdır. Yatırım tavsiyesi değildir uyarısı ekranda yer alır.

## Ana ekran widget'ı (Pro)

`expo-widgets` ile iOS (SwiftUI, küçük/orta boy) ve Android (Compose, 2×2) ana ekran widget'ı. Kullanıcı Piyasa → "Ana ekran widget'ı" ekranından (`app/widget.tsx`) birimi seçer: altın çeşitlerinden biri veya gram gümüş; seçim cihazda saklanır (`homeWidgetRepository`). Widget kendi başına veri çekemez; `HomeWidgetProvider` uygulama açıkken fiyatı en fazla dakikada bir, seçim/Pro/para birimi değişince ve uygulama arka plana geçerken `updateSnapshot` ile gönderir. Pro değilse widget fiyat yerine "Pro'ya özel" gösterir ve dokununca ödeme ekranını açar.

- Widget düzenleri: `src/homeWidgets/PriceWidget.ios.tsx`, `PriceWidget.android.tsx` (`'widget'` direktifli fonksiyonlar modül kapsamını görmez; sabitler fonksiyon içinde tanımlıdır).
- Yapılandırma: `app.json` → `expo-widgets` eklentisi (App Group `group.com.furkanages.altinkasam`).
- Expo Go'da ve web'de çalışmaz; development build gerekir: `npx expo run:ios` / `npx expo run:android` veya `eas build --profile development`. Expo Go'da modül yüklenemezse widget sessizce devre dışı kalır.

## Görünüm (açık / koyu tema)

Ayarlar → Görünüm: Sistem / Açık / Koyu; tercih cihazda saklanır. Renkler `src/core/theme/colors.ts`'teki `lightColors` / `darkColors` paletlerinden gelir; bileşenler sabit `colors` yerine `useTheme().colors` ve `makeStyles((colors) => ({ … }))` kullanır, böylece tema değişince ekranlar yeniden başlatılmadan güncellenir. Tercih `Appearance.setColorScheme` ile native tarafa da iletilir (klavye, uyarılar). `app.json` → `userInterfaceStyle: "automatic"`; "Sistem" seçeneğinin cihazın koyu modunu izlemesi için development build'in yeniden alınması gerekir.

## Pro (abonelik)

[RevenueCat](https://www.revenuecat.com) (`react-native-purchases`) ile. Ücretsiz/Pro sınırları `src/core/constants/premium.ts` içinde: ücretsiz planda 1G/1H grafik, yalnızca TL ve en fazla 5 kalem kasa; Pro bunları açar. Kilitli seçenekler `PRO` işaretiyle görünür ve dokununca `app/paywall.tsx` açılır.

1. `.env.example` → `.env.local` kopyalayıp RevenueCat public SDK anahtarlarını girin.
2. RevenueCat panelinde `premium` kimlikli bir entitlement ve aylık/yıllık paketli bir *current* offering oluşturun; mağaza ürünlerini bağlayın.
3. Gerçek satın alma için development build gerekir (`npx expo run:ios|android` veya `eas build --profile development`). Expo Go’da SDK önizleme modunda çalışır, satın alma yapmaz.
4. Kullanım koşulları ve gizlilik politikası taslakları `docs/legal/` içinde; yayımlanan sayfaların adresleri `EXPO_PUBLIC_TERMS_URL` ve `EXPO_PUBLIC_PRIVACY_URL` ile verilir (boşsa bağlantılar gizlenir). Apple Small Business Program’a başvurulmalı.

Anahtar yoksa uygulama ücretsiz modda çalışır; geliştirme derlemesinde ödeme ekranından Pro simüle edilebilir.

> **Ticari yayın öncesi:** Binance, Trunçgil ve Google Haberler kaldırıldı; kalan lisans ve mağaza riskleri [`docs/UYUMLULUK_RISKLERI.md`](docs/UYUMLULUK_RISKLERI.md) içinde.

## Bildirimler

Fiyat alarmları, ekonomik takvim hatırlatmaları ve takip edilen haber kaynakları cihazda üretilen yerel bildirimlerdir (`expo-notifications`; push yok). Akışlar, izinler, platform farkları ve bilinen sınırlar: [`docs/BILDIRIM_SISTEMI.md`](docs/BILDIRIM_SISTEMI.md).

## Veri kaynakları

FRED® API'nin zorunlu tuttuğu bildirim ("This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.", `src/core/constants/dataSources.ts`) Ayarlar > Veri kaynakları ekranında (`app/data-sources.tsx`, liste `DATA_SOURCE_GROUPS` + `PUBLISHER_FEEDS`) kaynakların tamamıyla birlikte gösterilir; uygulamanın başka hiçbir ekranında kaynak bilgisi yer almaz. TCMB ve Cleveland Fed verilerinin ticari kullanımı yazılı izne tabidir: izin alınana kadar TCMB anket beklentileri, TCMB karar metni alıntıları ve Cleveland Fed tahmini kapalıdır; izin gelince sunucu ortam değişkenleri `TCMB_COMMERCIAL_PERMISSION=1` / `CLEVELAND_FED_PERMISSION=1` ile açılır (Cleveland açılınca `dataSources.ts` listesine de eklenir). Kamuya duyurulmuş karar ve oranlar (faiz kararı, TÜFE, toplantı tarihleri) kaynak gösterilerek gösterilir.

## Yayın (EAS)

`eas.json`: `preview` (dahili dağıtım) ve `production` (mağaza; derleme numarası EAS'te tutulur ve her derlemede artar, `appVersionSource: remote`). `app.json`'da iPad desteği kapalı (`supportsTablet: false`) ve şifreleme beyanı `ios.config.usesNonExemptEncryption: false`.

API uçları (`app/api/*`) olmadan canlı sürümde fiyat ve takvim gelmez. Üretim derlemesi sunucuyu kendisi yayına alır ve adresini uygulamaya bağlar (`EXPO_UNSTABLE_DEPLOY_SERVER=1`, `eas.json` > production); bunun için `app.json`'a `origin` yazılmaz ve `app.config.js` kullanılmaz. İlk kurulum:

```bash
npx eas-cli@latest init                      # proje kimliği (expo.extra.eas.projectId)
# Sunucu anahtarları: secret (değeri sorulur; sohbete/koda yazılmaz)
npx eas-cli@latest env:set --name HASFIYAT_API_KEY --environment production --visibility secret
npx eas-cli@latest env:set --name FRED_API_KEY --environment production --visibility secret
npx eas-cli@latest env:set --name EVDS_API_KEY --environment production --visibility secret
# Herkese açık değerler: EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY, EXPO_PUBLIC_TERMS_URL,
# EXPO_PUBLIC_PRIVACY_URL, EXPO_PUBLIC_WEEKLY_ANALYSIS_URL (--visibility plaintext)
npx eas-cli@latest env:pull --environment production   # sunucunun ilk yayını
npx expo export --platform web
npx eas-cli@latest deploy --environment production
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --profile production --platform ios   # ya da android
```

### Yerel Android derlemesi (APK / AAB)

```bash
npm run android:keystore                                      # bir kez: Google Play yükleme anahtarı
npm run android:apk                                           # cihazda deneme: builds/*.apk
API_ORIGIN=https://<proje>.expo.app npm run android:aab       # Google Play: builds/*.aab
CLEAN=1 npm run android:aab                                   # android/'ı sıfırdan üret
```

`scripts/build-android.sh apk|aab`: `android/` klasörünü `app.json`'dan üretir/günceller (`expo prebuild`; git'e girmez, elle düzenlenmez), `gradlew assembleRelease` ya da `bundleRelease` ile derler, çıktıyı `builds/` altına kopyalar. JDK 17 ve Android SDK (`~/Library/Android/sdk`) gerekir; ilk derleme ~20 dk, sonrakiler ~13 dk.

İmza `plugins/withAndroidReleaseSigning.js` yapılandırma eklentisiyle eklenir: `credentials/android-signing.env` varsa (`npm run android:keystore` üretir; `credentials/` git'e girmez) release derleme yükleme anahtarıyla, yoksa debug anahtarıyla imzalanır. Debug imzalı AAB Google Play'e yüklenemez. Yükleme anahtarını ve şifresini güvenli bir yerde yedekle; Play'de "Play App Signing" açıkken asıl imza anahtarını Google tutar, kaybolan yükleme anahtarı Play Console'dan sıfırlatılabilir. Play her yüklemede daha büyük `versionCode` ister: yerel derlemede `app.json` > `expo.android.versionCode` artırılır (EAS derlemeleri sürümü kendisi artırır).

Release derlemede geliştirme sunucusu olmadığından `/api/...` istekleri `API_ORIGIN` (uygulamada `EXPO_PUBLIC_API_ORIGIN`, `src/data/datasources/http.ts`) adresine gider; verilmezse fiyat, grafik, takvim ve haber önizlemesi yüklenmez. `.env.local`'daki `EXPO_PUBLIC_*` değerleri pakete girer.

## Çalıştırma

```bash
npm install
npm run web      # http://localhost:3847
npm start        # Expo Dev Tools
npm run typecheck
```

## Klasörler

```
app/                 # Expo Router ekranları (View)
src/
  core/              # theme, constants, storage
  domain/            # enums, models
  data/              # datasources, repositories
  viewmodels/        # Provider ViewModels
  widgets/           # atomic UI
  providers/         # AppProviders
docs/CALISMA_PLANI.md   # çalışma planı ve yol haritası
```

## Gizlilik

[Gizlilik politikası](docs/legal/gizlilik-politikasi.md) · [Kullanım koşulları](docs/legal/kullanim-kosullari.md). Yayımlanan sayfanın adresi `EXPO_PUBLIC_PRIVACY_URL` olarak ve mağaza sayfalarına girilir.
