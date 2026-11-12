# Uyumluluk ve Yayın Riskleri

Altın Kasam'ın App Store / Google Play yayını öncesinde açık kalan lisans, mağaza kuralı ve mevzuat
riskleri. Kaynakların resmî kullanım koşullarından yapılan okumadır, **hukuki görüş değildir**;
yayın öncesi bir hukukçuyla gözden geçirilmelidir.

Son güncelleme: 11 Kasım 2026

Risk düzeyi: **Engel** = düzeltilmeden reddedilir ya da canlıda çalışmaz · **Yüksek** = şikâyet
veya inceleme sonucu kaldırılabilir · **Orta** = izin/teyit önerilir · **Düşük** = iyi uygulama.

## 1. Mağaza engelleri

| # | Konu | Düzey | Durum / yer | Yapılacak | Kimde |
| --- | --- | --- | --- | --- | --- |
| 1.1 | API sunucusu yayında değil | Engel | Fiyat, grafik, takvim, haber önizlemesi ve haftalık analiz yedeği `app/api/*` uçlarından gelir; canlı sürümde sunucu yoksa uygulama boş açılır (Apple 2.1). | `eas init`, sunucu anahtarlarını `eas env:set` ile tanımla, `eas deploy`; üretim derlemesi `EXPO_UNSTABLE_DEPLOY_SERVER=1` ile adresi bağlar (README > Yayın). | Sen |
| 1.2 | Satın alma yapılandırılmamış | Engel | `EXPO_PUBLIC_REVENUECAT_*` boş; ödeme ekranı "Satın alma şu anda kullanılamıyor" der, inceleme ekibi Pro'yu deneyemez (Apple 2.1, 3.1.1). | App Store Connect / Play Console'da abonelik ürünleri, RevenueCat'te `premium` entitlement ve current offering, anahtarlar EAS ortam değişkeni. | Sen |
| 1.3 | Kullanım koşulları ve gizlilik politikası yayımlanmadı | Engel | Taslaklar `docs/legal/`; `EXPO_PUBLIC_TERMS_URL` / `EXPO_PUBLIC_PRIVACY_URL` boş olduğu için bağlantılar gizli (Apple 3.1.2, 5.1.1; Play kullanıcı verisi politikası). | Taslakları doldurup bir adreste yayımla, adresleri ortam değişkenlerine ve mağaza sayfalarına gir. | Sen |
| 1.4 | Destek iletişimi yok | Engel | Uygulamadaki Destek bölümü kaldırıldı; uygulama içinde destek iletişimi yok. Mağazalar destek adresi ister. | Mağaza sayfasına destek URL'i/e-postası ekle (uygulama içi bölüm yok). | Sen |
| 1.5 | Haftalık analiz örnek içerik | Engel | `firebase/public/weekly-analyses.json` içindeki üç kayıt yer tutucudur (Apple 2.1 / 2.3). | Gerçek analizleri gir ya da yayına kadar dosyayı boş liste (`[]`) yap; bölüm boşken gizlenir. | Sen |
| 1.6 | Kullanıcı içeriği moderasyonu yok | Engel | Topluluk akışında Bluesky gönderileri var (kullanıcı içeriği); şikâyet, kullanıcı engelleme, filtre ve iletişim bilgisi yok (Apple 1.2; Play UGC politikası). | Gönderiye "Şikâyet et" ve "Bu hesabı gizle", küfür/uygunsuz içerik filtresi, Bluesky moderasyon etiketlerine (`labels`) uyma; ya da Bluesky'ı akıştan çıkarmak. | Kod |
| 1.7 | Mağaza formları | Engel | App Store "App Privacy", Play "Data safety", Play "Financial features" beyanı, yaş derecelendirmesi doldurulmadı. | Gizlilik taslağındaki veri dökümüne göre doldur (RevenueCat satın alma verisi, cihazda saklanan veriler, sunucuya giden istekler; izleme yok). | Sen |
| 1.8 | Yerel özellikler cihazda denenmedi | Orta | Ana ekran widget'ı (iOS App Group gerekir), alarm/takvim bildirimleri, `expo-modules-jsi` yaması yalnızca web/simülatörde denendi. | `eas build --profile preview` ile gerçek cihazda dene. | Sen |

## 2. Veri ve içerik lisansları

| # | Kaynak | Düzey | Ne kullanılıyor | Koşul | Yapılacak |
| --- | --- | --- | --- | --- | --- |
| 2.1 | **Hasfiyat (Harem)** | Orta | Tüm fiyatlar, metal ve altın çeşidi grafik geçmişi; arayüzde "Hasfiyat (Harem)" kaynağı yazıyor. | Ücretli, anahtarlı API. Belgeler son kullanıcıya gösterimi kısıtlamıyor; sözleşme metni incelenmedi. "Harem" Harem Altın'ın markasıdır. | Sözleşmede mobil uygulamada son kullanıcıya gösterim ve kaynak adı olarak "Harem" yazılmasının uygunluğunu yazılı teyit et. Kota: fiyat 10 sn'de bir (≈260 bin istek/ay), geçmiş 5–30 dk önbellekli. |
| 2.2 | **TCMB sayfaları ve EVDS** | Yüksek | PPK takvimi (Takvim sayfası), politika faizi (1 Hafta Repo sayfası), TÜFE değişimi (EVDS), faiz duyurusunun adresi. | "Bilgilerin ticari amaçlarla kullanımı TCMB'nin yazılı iznine tabidir." Anket beklentileri ve karar metni alıntıları kapalı (`TCMB_COMMERCIAL_PERMISSION`); kamuya duyurulmuş olgular kaynak gösterilerek gösteriliyor. EVDS'nin kendi koşul sayfası açılamadı. | TCMB'ye yazılı izin başvurusu. İzin gelince `TCMB_COMMERCIAL_PERMISSION=1`. |
| 2.3 | **TÜİK** | Orta | Yıllık haber bülteni takvimi (`takvim.tuik.gov.tr` JSON), bülten bağlantıları; TÜFE sonucu EVDS üzerinden. | TÜİK kullanım koşulları incelenmedi; takvim ucu belgelenmemiş bir iç uçtur. | TÜİK kullanım koşullarını kontrol et; mümkünse takvimi resmî yayın takviminden al. |
| 2.4 | **Yayıncı RSS akışları** | Yüksek | Investing.com Türkiye, TRT Haber, Hürriyet, Dünya, Anadolu Ajansı, Bloomberg HT (`PUBLISHER_FEEDS`): başlık, RSS özeti, bağlantı; haber detayında sayfanın `og:description` açıklaması. | Her yayıncının RSS ve içerik koşulları ayrı; ticari kullanım izinleri doğrulanmadı. Anadolu Ajansı içeriği abonelikle lisanslanır, Investing.com içerik kullanımını sınırlar. Pro abonelikli uygulamada haber özeti ticari kullanım sayılabilir. | Yayıncılardan yazılı izin al ya da yalnızca başlık + bağlantı göster; özet uzunluğunu kıs. | Sen |
| 2.5 | **Haber önizleme ucu** | Orta | `app/api/article+api.ts` yayıncı sayfasını sunucuda indirip açıklamayı okur; istekte mobil Safari kimliği (`User-Agent`) kullanılıyor. | Başka bir tarayıcı gibi görünmek ve sayfaları otomatik indirmek birçok sitenin koşullarına ve `robots.txt`'ye aykırı olabilir. | Kimliği uygulama adıyla değiştir (`AltinKasam/1.0`), `robots.txt`'ye uy, gerekirse ucu kapatıp yalnızca RSS özetini göster. |
| 2.6 | **Uzun dönem grafik tamamlama (Yahoo Finance)** | Yüksek | `app/api/history-long+api.ts`, Hasfiyat günlük geçmişi başlamadan önceki (4 Ekim 2026 öncesi) günleri Yahoo Finance'in resmî olmayan `chart` ucundan (GC=F, SI=F, PL=F, PA=F, USDTRY=X, EURTRY=X) alır; 3A/1Y grafiğinde yaklaşık veri olarak gösterilir. | Yahoo'nun verisi resmî bir API değildir ve kullanım koşulları ticari kullanımı kısıtlar; uç nokta haber verilmeden değişebilir ya da engellenebilir. Pro abonelikli uygulamada ticari kullanım sayılabilir. Seri vadeli işlem fiyatıdır, Harem fiyatı değildir. | Lisanslı bir geçmiş kaynağına (TCMB EVDS izinle, ya da ücretli veri sağlayıcı) geç; Hasfiyat günlük birikimi 1 yılı doldurunca bu ucu kaldır. | Sen |
| 2.6 | **Bluesky** | Orta | Anahtarsız arama ucuyla herkese açık gönderiler. | Bluesky geliştirici yönergeleri: silinen gönderiler ve moderasyon etiketlerine uyulmalı, kullanıcı içeriği sahibine ait. Ticari kullanım yasak değil. | Moderasyon etiketlerini uygula (1.6 ile birlikte), gönderileri uzun süre saklama. |
| 2.7 | **Topluluk beklentisi (Pro)** | Orta | Yayıncı başlıkları ve Bluesky gönderilerinden türetilen ücretli duygu analizi. | Türetilmiş içerik ücretli; 2.4 ve 2.6'daki izinlere bağlı. | 2.4 sonuçlanınca yeniden değerlendir. |
| 2.8 | **FRED** | Düşük | Fed faiz bandı, ABD TÜFE, tarım dışı istihdam, BLS açıklama günleri. | Ticari kullanım serbest; zorunlu not uygulamada var (Veri kaynakları, takvim notları, ABD raporları). Kullanım koşulları maddesi taslakta var. | Kullanım koşullarını yayımla (1.3). |
| 2.9 | **Federal Reserve, BLS** | Düşük | FOMC takvimi ve karar metni, bülten bağlantıları. | ABD kamu bilgisi; kaynak gösterilerek kullanılabilir. | — |
| 2.10 | **Cleveland Fed** | Kapalı | Anlık enflasyon tahmini kapalı (`CLEVELAND_FED_PERMISSION`). | Yalnızca ticari olmayan kullanım serbest. | Açmak için izin al; açınca Veri kaynakları listesine ekle. |

## 3. Mevzuat

| # | Konu | Düzey | Açıklama | Yapılacak |
| --- | --- | --- | --- | --- |
| 3.1 | Yatırım danışmanlığı (SPK) | Yüksek | Haftalık analizlerdeki yön ve destek/direnç seviyeleri, ekonomik takvim raporlarındaki "altın için anlamı" yorumları ve Pro'da ücretli sunulmaları lisans gerektiren yatırım danışmanlığına yakın durabilir. "Yatırım tavsiyesi değildir" uyarıları mevcut. | Hukukçu görüşü; analizlerde kişiye özel olmayan, genel piyasa yorumu dilini koru; uyarıları analiz ve rapor ekranlarında görünür tut. |
| 3.2 | KVKK | Orta | Hesap yok, kişisel veri cihazda; sunucu istekleri IP içerir, RevenueCat ve barındırma yurt dışında. | Gizlilik politikasını (aydınlatma metni) yayımla; yurt dışı aktarım maddesini hukukçuya kontrol ettir. |
| 3.3 | Abonelik bilgilendirmesi | Düşük | Otomatik yenileme metni ödeme ekranında var; koşul ve gizlilik bağlantıları adresler girilince görünür. | 1.3 tamamlanınca ödeme ekranını kontrol et. |
| 3.4 | Marka | Düşük | "Altın Kasam" adının tescil ve mağaza uygunluğu kontrol edilmedi. | TÜRKPATENT ve mağazalarda ad araması. |

## 4. Bu sürümde kapatılanlar

| Konu | Ne yapıldı |
| --- | --- |
| Binance (anlık hareket, grafik geçmişi) | Kaldırıldı. Grafikler Hasfiyat Harem geçmişinden; anlık akış yerine 10 sn REST yenilemesi. |
| Trunçgil (yedek fiyat) | Kaldırıldı; tek kaynak Hasfiyat. 18 ayar ve Reşat listede yok, kasada gram fiyatından yaklaşık değerlenir. |
| Google Haberler RSS | Kaldırıldı ("personal, non-commercial use" kısıtı). |
| Haber metni kopyalama | Haber detayında paragraf çekilmiyor; yalnızca yayıncının önizleme açıklaması. |
| TCMB anket beklentileri, karar metni alıntıları | İzin bayrağıyla kapalı. |
| Cleveland Fed tahmini | İzin bayrağıyla kapalı. |
| FRED zorunlu bildirimi | Veri kaynakları ekranı, takvim notları ve ABD raporlarında. |
| Şifreleme beyanı, iPad | `usesNonExemptEncryption: false`, `supportsTablet: false`. |
| Haftalık analiz koda gömülü | Firebase Hosting'deki JSON'dan okunuyor (1.5 hâlâ açık: içerik örnek). |
