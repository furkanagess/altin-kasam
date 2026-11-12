# Altın Kasam — Pro Özellik ve Dönüşüm Fikirleri

Amaç: kullanıcıya gerçek fayda sağlayan ve ücretsizden Pro'ya geçişi artıran eklentileri sıralamak.
Bu dosya bir fikir listesidir; hiçbir madde kararlaştırılmış değildir. Dönüşüm etkisi sütunları
tahmindir, ölçülmüş veri değildir. Her madde yayına alınmadan önce RevenueCat deneyleriyle sınanmalıdır.

## Mevcut durum (kodda olanlar)

| Alan | Ücretsiz | Pro |
| --- | --- | --- |
| Grafik süresi | 1G, 1H | 1A, 3A, 1Y |
| Para birimi | TRY | USD, EUR |
| Kasa | 5 kalem | sınırsız |
| Fiyat alarmı | 1 | sınırsız |
| Topluluk beklentisi / haber özeti | yok | var |
| Ekonomik takvim ve karar raporları | yok | var |
| Ana ekran widget'ı | yok | var |

Ücretsiz katman cömert: fiyatları, kasayı ve hedefi tam kullanıyorlar. Bu iyi bir ürün, ama Pro'ya
geçmek için güçlü bir "an" yaratmıyor. Aşağıdaki fikirler bu anları üretmeye odaklanır.

## 1. Kasa derinliği (kullanıcı veri girdikçe vazgeçilmez olur)

Veri girmiş kullanıcı geçiş maliyetini hisseder; en yüksek dönüşüm buradan beklenir.

| Fikir | Kullanıcıya faydası | Ücretsiz / Pro ayrımı | Zorluk |
| --- | --- | --- | --- |
| **Aylık kasa raporu (PDF/paylaşım kartı)** | Ay sonunda kâr/zarar, en iyi/en kötü kalem, dağılım tek sayfada | Son ayın özeti ücretsiz önizleme, tam rapor ve geçmiş aylar Pro | Orta |
| **Kâr/zarar analizi (vergi ve satış simülasyonu)** | "Bunu bugün satsam ne kalır?" hesabı, ortalama maliyet karşılaştırması | Tek kalem ücretsiz, tüm kasa Pro | Düşük |
| **Dışa aktarma (CSV)** | Kasayı Excel'e almak, muhasebeci/aileyle paylaşmak | Pro | Düşük |
| **Kasa yedeği ve cihaz değişimi** | Telefon değişince ya da uygulama silinince kasa kaybolmasın | Pro (bkz. aşağıdaki not) | Yüksek |
| **Çoklu kasa** | "Ev", "Çocuğun altını", "Düğün birikimi" gibi ayrı hedefli kasalar | 1 kasa ücretsiz, çoklusu Pro | Orta |
| **Hedef takibi gelişmiş** | Hedefe kaç ay kaldı, aylık ne kadar biriktirmeli, bir hedef için birden çok varlık | Tek hedef ücretsiz, çoklu hedef ve tahmin Pro | Orta |

Not (yedek): Şu an tüm veri AsyncStorage'da, yani yalnızca cihazda. Uygulama silinince kasa gider.
Yedek, güvenlik açısından en güçlü satış nedenidir ("birikimin kaybolmaz") ama hesap/giriş sistemi
ve gizlilik metni değişikliği gerektirir. Kapsamı en büyük madde bu.

## 2. Akıllı bildirimler (her gün geri getirir)

Mevcut alarm sistemi fiyat eşiğine dayanıyor. Bildirim, tutundurmanın en ucuz yolu.

| Fikir | Kullanıcıya faydası | Ücretsiz / Pro ayrımı |
| --- | --- | --- |
| **Hedef fiyat dışı alarmlar** | Yüzde değişim ("%2 düşerse"), günlük kapanış, ons-gram makası | Fiyat eşiği ücretsiz, diğer tipler Pro |
| **Kasa alarmı** | Toplam kasan X ₺'yi geçince ya da %Y düşünce haber ver | Pro |
| **Takvim hatırlatması öncesi "ne beklenmeli"** | Fed/TCMB kararından önce kısa senaryo notu | Pro |
| **Ani hareket uyarısı** | Altın/gümüş saatte %1'den fazla oynarsa | Pro |

## 3. Analiz ve içerik (Pro'nun "akıllı" yüzü)

| Fikir | Kullanıcıya faydası | Zorluk |
| --- | --- | --- |
| **Haftalık kasa karnesi** | Kasanı piyasaya göre nasıl performans gösterdi; kısa, kişisel yorum | Orta |
| **Altın / gümüş rasyosu bildirimi** | Rasyo tarihsel uçlara gelince uyarı (rasyo grafiği zaten var) | Düşük |
| **Karşılaştırma modu** | Kasan, "sadece mevduat" ve "sadece dolar" tutsaydın karşılaştırması | Orta |
| **Geçmişe dönük "ya alsaydım"** | Belirli tarihte X gram alsaydın bugün ne olurdu | Düşük |
| **Gram altın yerine ziynet maliyet farkı** | Çeyrek/bilezik işçilik farkını gösteren gerçek değer hesabı | Orta |
| **Önceden planlanmış ekonomik olay etki geçmişi** | Aynı tür açıklamada altın geçmişte ne yaptı | Yüksek (veri gerekir) |

Dikkat: yatırım tavsiyesi gibi okunan hiçbir metin eklenmemeli. Topluluk beklentisi gibi mevcut
özelliklerde olduğu gibi "bilgilendirme amaçlıdır" çerçevesi korunmalı (bkz. `UYUMLULUK_RISKLERI.md`).

## 4. Paylaşım ve büyüme (ücretsiz kullanıcıyı çoğaltır)

| Fikir | Not |
| --- | --- |
| **Kasa kartı paylaşımı** | Tutar gizli, yalnızca yüzde değişimli şık kart. Markalı filigran ücretsizde, filigransız Pro |
| **Aile paylaşımı** | Tek abonelikle 2-5 kişi (mağaza aile paylaşımı açılabilir) |
| **Davet et, 1 hafta Pro kazan** | İki taraflı ödül; RevenueCat promosyon teklifleriyle yapılabilir |

## 5. Paywall'u tetikleyen doğru anlar

Dönüşüm çoğunlukla ekranın kendisinden değil, **gösterildiği andan** gelir. Mevcut tetikleyiciler
(`timeframe`, `currency`, `holdings`, `insight`, `widget`, `alarm`, `calendar`) iyi. Eklenebilecekler:

- 5. kalem eklenince değil, **4. kalemde** nazik bir "1 kalem hakkın kaldı" bilgisi (sert engel değil).
- Kasa ilk kez 3 gün üst üste açıldığında **deneme teklifi** (yeni kullanıcıya ilk gün değil).
- Alarm tetiklendiğinde, tetiklenen alarmın bildiriminde "bir sonrakini de kur" Pro vurgusu.
- İlk kâr/zarar görüldüğünde (ilk kez pozitif PnL) paylaşım kartı + Pro teklifi.
- Ay sonunda aylık rapor önizlemesi, tam rapor için paywall.

## 6. Fiyatlama ve teklif denemeleri

RevenueCat Experiments ile sınanabilir. Hiçbirinin sonucu önceden bilinmez.

- **Yıllık varsayılan seçili**, aylık yalnızca karşılaştırma için. (Promptta zaten böyle.)
- **7 gün deneme vs. deneme yok**: Türkiye'de kart ile deneme sürtünmesini ölçmek için ayrı deney.
- **Yerel fiyatlandırma**: TRY'de enflasyona göre fiyat güncellemesi; mağaza bölgesel fiyatını kullan.
- **Ömür boyu paketi**: birikim odaklı kitlede "tek sefer öde" çekici olabilir, ama gelir tahmini zayıflar.
- **İptal eden kullanıcıya geri kazanım teklifi** (win-back), ilk ay indirimli.
- **Öğrenci / aile planı** yalnızca talep gelirse.

## 7. Önerilen sıra

1. **Kolay ve hızlı kazanım:** CSV dışa aktarma, "ya alsaydım" hesabı, rasyo bildirimi, 4. kalem bilgilendirmesi.
2. **Orta vadede asıl fark:** aylık kasa raporu, gelişmiş alarm tipleri, çoklu hedef/çoklu kasa.
3. **Uzun vadede en güçlü:** yedek ve cihaz değişimi (hesap sistemi gerektirir), aile paylaşımı.

## 8. Ölçüm (önce bunları kur)

Karar vermeden önce şu olaylar ölçülmeli; yoksa hangi fikrin işe yaradığı bilinemez:

- Paywall görüntüleme sebebine göre (`reason`) görüntüleme sayısı ve satın alma oranı
- Kasa kalem sayısı dağılımı (kaç kullanıcı 4-5 kaleme ulaşıyor)
- Alarm kurma ve tetiklenme sayısı
- Deneme başlatma, denemeden ücretliye geçiş, ilk haftada iptal
- 1., 7., 30. gün geri dönüş oranı

## Riskler

- **Fazla kilit:** Ücretsiz katmanı daraltmak kısa vadede dönüşümü artırır ama yorum puanını ve organik büyümeyi düşürür.
  Temel fiyat ve kasa deneyimi ücretsiz kalmalı.
- **Mağaza kuralları:** Paywall'da yalnızca uygulamada gerçekten bulunan özellikler anlatılmalı.
  Fikir aşamasındaki bir özellik, çıkmadan vaat edilmemeli.
- **Yedek ve hesap:** Kişisel veri sorumluluğu getirir (KVKK, gizlilik politikası, veri silme akışı).
- **Yatırım tavsiyesi sınırı:** Analiz ve bildirim metinleri yönlendirici olmamalı.
