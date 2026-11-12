# Altın Kasam: gerçek büyüme planı

Bu belge "günlük 3 dolarlık Search Ads" planının (`SEARCH_ADS_1_AYLIK_PLAN.md`) neden tek başına
büyüme getirmeyeceğini ve büyümenin gerçekte nereden geleceğini anlatır.

> Rakamlar **varsayımdır**, ölçülmüş veri değildir; uygulama yayına çıktıkça yerlerine gerçek
> değerler yazılmalıdır. Garanti verilen bir sonuç yoktur. Piyasa verisi (rakip indirme sayıları,
> sektör ortalamaları) bu belgede **bilerek verilmemiştir**: doğrulayamadığım sayıyı yazmak
> planı yanıltır.

## 1. Dürüst teşhis

| Gerçek | Sonucu |
| --- | --- |
| 90 USD'lik reklam bütçesi, kullanıcı tabanı değil **öğrenme** satın alır | Reklam tek başına büyüme planı değildir |
| Ücretli aboneye dönüşüm düşük oranlıdır; 100 kurulumdan genelde birkaç abone beklenir | Ayda onlarca kurulumla abone sayısı istatistiksel olarak anlamsızdır |
| Bir abonenin sana getirisi, kazanma maliyetinden yüksek olmalı | Bunu bilmeden bütçe artırmak zarar yazar (bölüm 3) |
| Finans uygulamasında güven ve tutunma kurulumdan önemlidir | Önce ürün elde tutmalı, sonra kullanıcı çekilmeli |
| Türkiye'de altın ilgisi **mevsimsel ve olay güdümlüdür** (rekor, düğün sezonu, kur şoku) | Büyümenin büyük kısmı bu pencerelerde yakalanır |

**Sonuç:** büyüme üç kaynaktan gelir, ücretli reklam bunlardan **en küçüğü**dür:

1. **Ürünün kendi döngüsü** (paylaşım kartı, alarm, bildirim): kullanıcı başına maliyet sıfır.
2. **İçerik ve topluluk** (video, analiz, forum): zaman maliyeti var, para maliyeti düşük.
3. **Ücretli kanal** (Search Ads): yalnızca 1 ve 2 işe yaradığı kanıtlandıktan sonra ölçeklenir.

## 2. Hedefleri gerçek sayılarla koy

Önce kendi hedefini yaz; aşağıdaki tablo bir şablondur ve **örnek sayılar kullanır**.

| Ölçü | 1. ay | 3. ay | 6. ay |
| --- | --- | --- | --- |
| Toplam kurulum (örnek hedef) | 300 | 2.000 | 8.000 |
| Haftalık aktif kullanıcı | 90 | 600 | 2.400 |
| 7. gün geri dönüş oranı | %20 | %25 | %30 |
| Pro'ya dönüşüm (kurulumdan) | %1 | %2 | %3 |
| Pro abone sayısı | 3 | 40 | 240 |

Bu hedefler gerçekleşen veriyle her ay yeniden yazılmalıdır. Hedef, **kanıtlanmış büyüme
oranından** türetilmeli; önce tahmin edilmemelidir.

## 3. Bütçeyi neye göre artıracağını bil (birim ekonomisi)

Reklam bütçesini artırmadan önce şu üç sayı elinde olmalı:

```
Abone başına getiri (LTV)  = aylık fiyat × ortalama abonelik ayı × (1 - mağaza komisyonu)
Kurulum başı maliyet (CPI) = reklam harcaması / kurulum
Abone başı maliyet (CAC)   = CPI / (kurulumdan aboneye dönüşüm)
```

Kural: **LTV, CAC'in belirgin biçimde üstündeyse** reklamı ölçekle. Değilse bütçeyi artırma,
önce dönüşümü ya da tutunmayı düzelt.

Kendi sayılarını doldur (burada değer **yazılmamıştır**, çünkü fiyat ve dönüşümün henüz
gerçek verisi yok):

| Değişken | Değer |
| --- | --- |
| Pro aylık fiyatı | |
| Ortalama abonelik süresi (ay) | |
| Mağaza komisyonu | |
| Kurulumdan aboneye dönüşüm | |
| CPI (reklamdan) | |
| LTV | |
| CAC | |
| LTV / CAC | |

## 4. Aşama aşama plan

### Aşama 0: Temel (hafta 0-2). Reklam açmadan önce

Amaç: kullanıcı geldiğinde kaybolmasın ve ölçülebilsin.

| # | İş | Başarı ölçüsü |
| --- | --- | --- |
| 1 | Analitik olayları: kurulum, ilk açılış tamamlandı, ilk varlık eklendi, alarm kuruldu, paylaşım yapıldı, paywall görüldü, Pro alındı | Hepsi panelde görünüyor |
| 2 | İlk açılış hunisi: kurulum → ilk varlık ekleme oranını ölç ve kayıp noktasını bul | Oran ölçülüyor |
| 3 | Mağaza sayfası: başlık, alt başlık, anahtar kelimeler, ilk 3 ekran görüntüsü (canlı fiyat, kasa getirisi, alarm), yeni kasa ikonu | Sayfa yayında |
| 4 | Paylaşım kartına mağaza bağlantısı ve uygulama adı | Kart güncel |
| 5 | Puan isteme: ilk alarm tetiklendikten sonra memnun kullanıcıdan | Akış çalışıyor |
| 6 | Push bildirim izni: değer gösterildikten sonra iste (alarm kurma anında) | İzin oranı ölçülüyor |
| 7 | Çökme izleme ve temel performans kontrolü | Çökmesiz oturum oranı izleniyor |

**Çıkış koşulu:** kurulumdan ilk varlığa dönüşüm ve 7. gün tutunma ölçülüyor. Bu iki sayı kötüyse
(örneğin ilk varlık ekleyen azsa) **reklam açılmaz**, önce ürün düzeltilir.

### Aşama 1: Organik çekirdek (hafta 2-8). Ücretsiz kullanıcı kazanımı

Haftalık sabit ritim (zaman maliyeti):

| Ritim | İçerik |
| --- | --- |
| Haftada 3 kısa video | Gerçek kullanım ekran kaydı (TikTok, Reels, Shorts). Fikirler: "20 çeyreğim ne ediyor", "altın alarmı kurdum", "1 yıl önceki altınım" |
| Haftada 1 analiz özeti | Herkese açık haftanın özeti; X/Twitter ve Telegram'da |
| Haftada 5 forum/grup cevabı | Soruya yardımcı cevap, uygulamayı doğal şekilde an; spam yok |
| Ayda 5-10 küçük influencer teması | 5-50 bin takipçili birikim ve finans anlatanlar; kurulum ya da kod başına ödeme |

Ölçü: her içerikten gelen kurulum (bağlantı ya da kod ile). Ay sonunda en iyi 2 içerik biçimi
seçilir, diğerleri bırakılır.

### Aşama 2: Ücretli test (hafta 4-8). Küçük bütçe, büyük öğrenme

Bütçe: `SEARCH_ADS_1_AYLIK_PLAN.md`'deki 3 USD/gün planı. Amaç: kazanan kelimeleri ve mağaza
sayfasını bulmak. Bu aşamanın çıktısı **kelime listesi ve CPI**, kullanıcı sayısı değil.

### Aşama 3: Ölçekleme kararı (hafta 8-12)

Karar noktası, bölüm 3'teki LTV/CAC ve tutunma sayılarıyla verilir:

| Durum | Eylem |
| --- | --- |
| LTV/CAC iyi, tutunma iyi | Search Ads bütçesini kademeli artır; Google Ads ve Meta/TikTok reklamı ekle |
| CPI iyi, ilk varlık oranı düşük | Reklamı durdur, ilk açılışı düzelt |
| Organik içerik reklamdan ucuz kullanıcı getiriyor | Bütçeyi içeriğe (üretim, influencer) kaydır |
| Veri yetersiz | Birkaç hafta daha aynı bütçeyle çalıştır; karar verme |

### Aşama 4: Aboneliği büyütme (sürekli)

| Konu | Ne yapılır |
| --- | --- |
| Değeri ilk haftada göster | Alarm sınırı (ücretsiz 1) ve güncel haftalık analiz Pro'ya geçişin ana tetikleyicileri |
| Deneme süresi | 3-7 gün ücretsiz deneme (RevenueCat destekler); dönüşüm artar mı ölç |
| Paywall zamanlaması | Değer görüldükten sonra göster: ilk alarm sonrası, ikinci alarm denemesinde |
| Yıllık plan | Öne çıkar, "aylık X TL" olarak göster |
| Olay güdümlü bildirim | Piyasa sert hareket ettiğinde, alarm kuran kullanıcılara fırsat penceresi mesajı; ilgi o günlerde en yüksektir |
| Vazgeçme analizi | Aboneliği bırakanlara tek soruluk anket; sebebi öğren |

## 5. Mevsimsellik ve olay takvimi

Altın ilgisi belirli pencerelerde artar. Bu pencereler önceden planlanır (tarihler her yıl
yeniden doğrulanmalı):

| Pencere | Hazırlık |
| --- | --- |
| Rekor fiyat haberleri | Hazır içerik şablonu; haberden sonraki 24 saat içinde yayımla |
| Düğün ve nişan sezonu | "Düğün takısı kaç gram, ne kadar" içeriği; ziynet kelimelerine reklam bütçesi |
| Kur şoku ve enflasyon açıklamaları | Haftalık analiz ve takvim içeriği |
| Yıl sonu ve bayram öncesi | Birikim ve hediye altını içeriği |

Bu pencerelerde Search Ads bütçesi geçici artırılabilir; ilgi yüksek olduğunda CPI de yükselir,
bu yüzden maliyeti izleyerek artır.

## 6. Güven ve uyum (finans uygulaması için kritik)

- "Kesin kazanç", "garanti", "para kazandırır" ifadeleri **yasak**; uygulamanın kendi cümlesi:
  "Yatırım tavsiyesi değildir".
- Fiyat kaynağı ve güncellik bilgisi görünür olsun (uygulamada son güncelleme saati zaten var).
- Gizlilik politikası ve veri kullanımı mağaza sayfasında net olsun.
- Apple ve Google finans reklamlarını sıkı denetler; reklam metnini göndermeden önce kurallara
  göre kontrol et.

## 7. Haftalık takip paneli

Her pazartesi tek sayfada:

| Ölçü | Bu hafta | Geçen hafta | Fark |
| --- | --- | --- | --- |
| Yeni kurulum (organik / ücretli) | | | |
| İlk varlığı ekleyen oranı | | | |
| 7. gün geri dönüş | | | |
| Haftalık aktif kullanıcı | | | |
| Alarm kuran kullanıcı | | | |
| Paylaşım sayısı | | | |
| Paywall görüntüleme → Pro | | | |
| Yeni abone / iptal | | | |
| Reklam harcaması ve CAC | | | |
| Mağaza puanı ve yorum sayısı | | | |

Haftalık karar sorusu: **hangi tek şeyi değiştirirsem bir sonraki haftanın sayısı artar?** Aynı
anda birden fazla şeyi değiştirme.

## 8. Yapılmaması gerekenler

- Analitik olmadan reklam bütçesi artırmak.
- Önce kullanıcı tutunmasını düzeltmeden pahalı kullanıcı çekmek.
- 90 dolarlık bütçeden abone sayısı beklemek.
- Aynı anda çok sayıda kanalı denemek; her kanal ayrı öğrenme ister. Sırayla ilerle.
- Rakip marka adlarıyla ilk aylarda reklam vermek.
- Hedefi veriden değil dilekten koymak.

## 9. Öncelik sırası (özet)

1. Analitik olayları ve ilk açılış hunisi (tutunmayı görmeden hiçbir şey ölçeklenmez).
2. Paylaşım kartı ve mağaza sayfası (en ucuz büyüme).
3. Haftalık içerik ritmi (video, analiz, forum).
4. Küçük bütçeli Search Ads testi (öğrenme için).
5. Birim ekonomisine göre karar: ölçekle ya da ürünü düzelt.
6. Abonelik dönüşümü: deneme süresi, paywall zamanlaması, olay güdümlü bildirim.

İlgili belgeler: `REKLAM_VE_BUYUME.md` (kanal önerileri ve Apple Ads şeması),
`SEARCH_ADS_1_AYLIK_PLAN.md` (3 USD/gün, 30 günlük plan).
