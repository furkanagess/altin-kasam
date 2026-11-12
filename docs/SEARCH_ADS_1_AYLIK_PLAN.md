# Apple Search Ads: günlük 3 dolarla 1 aylık plan

Bütçe: **günlük 3 USD × 30 gün = 90 USD**. Amaç bu bütçeyle uygulamayı büyütmek değil,
**hangi anahtar kelime ve hangi mağaza sayfası kurulum ve ilk varlık ekleme getiriyor**
sorusunu cevaplamak ve bir sonraki ay için kanıtlı bir yapı çıkarmaktır.

> Bu belgedeki tüm teklif, maliyet ve kurulum sayıları **varsayımdır**, ölçülmüş değildir.
> Türkiye'de altın uygulaması kelimelerinin gerçek maliyeti ilk hafta görülür. Apple'ın
> menüleri, minimum günlük bütçesi ve ürün adı ("Apple Ads") değişebilir; kampanyayı açarken
> panelde doğrula. Garanti verilen bir sonuç yoktur.

## 1. Gerçekçi beklenti

90 USD küçük bir bütçedir. Kurulum başı maliyet (CPI) için aşağıdaki aralıklar yalnızca
planlama içindir:

| Senaryo | Varsayılan CPI | 30 günde kurulum |
| --- | --- | --- |
| İyi | 0,5 USD | ~180 |
| Orta | 1,0 USD | ~90 |
| Kötü | 2,0 USD | ~45 |

Bu sayılarla ücretli aboneye dönüşüm istatistiksel olarak anlamlı olmaz. Bu yüzden başarı ölçüsü
**ilk varlığı ekleyen kullanıcı** ve **kurulum başı maliyet**tir; abone sayısı yalnızca
gözlem olarak izlenir. Ay sonunda tek bir işe yarayan kelime ve sayfa bulmak başarıdır.

## 2. Başlamadan önce (0. gün; bunlar yoksa reklamı açma)

| # | Hazırlık | Neden |
| --- | --- | --- |
| 1 | Uygulama App Store'da yayında ve ilk açılış akışı çalışıyor | Reklam kurulumu mağaza sayfasına götürür |
| 2 | Kurulum ve "ilk varlığı ekledi" olayları ölçülüyor | Bunsuz hangi kelimenin işe yaradığı bilinmez (bkz. `docs/REKLAM_VE_BUYUME.md`, bölüm 8) |
| 3 | Mağaza başlığı, alt başlık ve anahtar kelime alanı güncel | Reklamla gelen kullanıcı sayfada karar verir |
| 4 | İlk 3 ekran görüntüsü: canlı fiyat, kasa getirisi, alarm; yeni kasa ikonu | Dönüşümü belirler |
| 5 | Apple Ads hesabı, ödeme yöntemi ve ülke ayarı (Türkiye) açık | Kampanya başlatmak için |
| 6 | Hedef: yalnızca iPhone, Türkiye, Türkçe | Bütçeyi dağıtmamak için |
| 7 | Gizlilik politikası ve uygulama puanı isteme akışı hazır | Mağaza güveni |

## 3. Kampanya yapısı (3 dolarlık bütçeye uygun, sade)

Bütçe çok küçük olduğu için **tek kampanya, üç reklam grubu** kullanılır. Birden fazla
kampanya bütçeyi böler ve hiçbirinde veri toplanamaz.

```
Kampanya: AK-Genel-TR     (günlük 3 USD, toplam 90 USD)
├── Reklam grubu A: Altın fiyatı      (tam eşleşme)
├── Reklam grubu B: Ziynet ve takip   (tam eşleşme)
└── Reklam grubu C: Keşif             (geniş eşleşme + Search Match; çok düşük teklif)
```

Marka (K1) ve rakip (K3) kampanyaları bu ayın planında **yoktur**: marka adı henüz aranmıyor
olabilir ve rakip kelimeleri hesap kuralı açısından hassastır. Ay sonunda duruma göre eklenir.

### 3.1 Reklam grubu A: Altın fiyatı (tam eşleşme)

```
altın fiyatı
altın fiyatları
canlı altın
gram altın
gram altın fiyatı
```

### 3.2 Reklam grubu B: Ziynet ve takip (tam eşleşme)

```
çeyrek altın
çeyrek altın fiyatı
cumhuriyet altını
altın takip
altın alarm
altın fiyat alarmı
altın portföy
```

### 3.3 Reklam grubu C: Keşif (geniş eşleşme + Search Match)

Amaç hangi gerçek aramaların kurulum getirdiğini bulmaktır. Çok düşük teklif ve düşük bütçe
payıyla çalışır. İlk 10 günden sonra kurulum getiren terimler A ya da B'ye **tam eşleşme**
olarak taşınır.

```
altın, gümüş, altın birikim, altın hesaplama, altın kasası
```

### 3.4 Negatif anahtar kelimeler (kampanya düzeyinde, 0. günde eklenir)

```
bedava altın, altın oyunu, altın madeni oyun, altın dişi, altın saat satın al,
altın kolye modelleri, altın iş ilanı, kripto, bitcoin, forex, borsa istanbul hisse
```

## 4. Bütçe ve teklif

### 4.1 Günlük bütçe dağılımı (toplam 3 USD)

Apple günlük bütçeyi kampanya düzeyinde ister; grup payları teklifle kontrol edilir.

| Grup | Hedef pay | Nasıl sağlanır |
| --- | --- | --- |
| A Altın fiyatı | ~%40 | Orta teklif |
| B Ziynet ve takip | ~%40 | Orta teklif |
| C Keşif | ~%20 | En düşük teklif |

### 4.2 Teklif (varsayım; ilk hafta güncellenir)

| Grup | Başlangıç tavan teklifi (CPT) |
| --- | --- |
| A | 0,60 USD |
| B | 0,60 USD |
| C | 0,25 USD |

Kural: Apple'ın önerdiği teklif aralığına bak. Önerilen aralığın alt yarısından başla, çok
düşük teklif gösterimi sıfıra indirir, çok yüksek 3 dolarlık bütçeyi birkaç tıklamada bitirir.
Günlük bütçe erken doluyorsa teklifi düşür, hiç harcama olmuyorsa yükselt.

### 4.3 Toplam

30 gün × 3 USD = **90 USD**. Bütçe aşılmasın diye kampanya toplam (yaşam boyu) bütçesi 90 USD'ye
ayarlanır, günlük bütçe 3 USD'dir.

## 5. Özel Ürün Sayfaları (Custom Product Pages)

İki sayfa hazırlanır; her biri bir reklam grubuna bağlanır. Sayfa başına tek mesaj:

| Sayfa | Reklam grubu | İlk ekran görüntüsü | Başlık metni fikri |
| --- | --- | --- | --- |
| P1 Fiyat | A | Canlı gram altın fiyatı ekranı | "Canlı altın fiyatı, tek bakışta" |
| P2 Alarm ve kasa | B | Alarm kurma ekranı ve kasa getirisi | "Hedef fiyata gelince haber ver. Altınının getirisini gör." |

Kural: İki sayfayı karşılaştırırken yalnızca ilk ekran görüntüsü farklı olsun; aksi halde sonucu
neye bağlayacağını bilemezsin.

## 6. Gün gün plan

### Hafta 1 (gün 1-7): kurulum ve ilk veri

| Gün | Yapılacak |
| --- | --- |
| 1 | Kampanyayı bölüm 3-5'e göre kur, negatifleri ekle, toplam bütçeyi 90 USD yap, yayına al |
| 2 | Bütçenin harcanıp harcanmadığına bak. Harcama yoksa: kelime onaylandı mı, teklif çok düşük mü kontrol et |
| 3 | Gösterim, dokunma ve kurulum sayısına bak; **hiçbir şeyi değiştirme** (öğrenme dönemi) |
| 4-6 | Her gün yalnızca bütçe harcaması ve hata durumu kontrol edilir |
| 7 | **Hafta 1 değerlendirmesi** (bölüm 7): arama terimleri raporunu aç, negatif ekle |

### Hafta 2 (gün 8-14): temizlik

| Gün | Yapılacak |
| --- | --- |
| 8 | Arama terimlerinden alakasız olanları negatife ekle |
| 10 | Keşif grubundan kurulum getiren terimleri A ya da B'ye tam eşleşme olarak taşı |
| 12 | Hiç dokunma almayan ya da 20+ dokunuşta 0 kurulum getiren kelimeleri durdur |
| 14 | **Hafta 2 değerlendirmesi**: kurulum başı maliyet ve ilk varlık ekleme oranı |

### Hafta 3 (gün 15-21): sayfa testi

| Gün | Yapılacak |
| --- | --- |
| 15 | P1 ve P2'nin dönüşüm oranını karşılaştır (dokunma → kurulum) |
| 17 | Daha iyi sayfayı tüm gruplara bağla, kaybedeni kapat |
| 19 | Kazanan kelimelerin teklifini %10-20 artır (tek seferde fazlası değil) |
| 21 | **Hafta 3 değerlendirmesi** |

### Hafta 4 (gün 22-30): odaklanma ve karar

| Gün | Yapılacak |
| --- | --- |
| 22 | Kurulum getirmeyen kelimelerin bütçesini en iyi 3-5 kelimeye kaydır |
| 25 | Marka kampanyası (K1) gerekli mi bak: marka adı arama alıyor mu? |
| 28 | Ay sonu raporunu hazırla (bölüm 8) |
| 30 | Kampanyayı durdur ya da sonraki ay için bütçeyi güncelle; kararı bölüm 9'a göre ver |

## 7. Haftalık değerlendirme kuralları

Her hafta aşağıdaki tablo doldurulur:

| Ölçü | Hafta 1 | Hafta 2 | Hafta 3 | Hafta 4 |
| --- | --- | --- | --- | --- |
| Harcama (USD) | | | | |
| Gösterim | | | | |
| Dokunma | | | | |
| Dokunma oranı (TTR) | | | | |
| Kurulum | | | | |
| Dokunma → kurulum oranı | | | | |
| Kurulum başı maliyet (CPI) | | | | |
| İlk varlığı ekleyen | | | | |
| İlk varlık başı maliyet | | | | |
| Pro'ya geçen | | | | |

Karar kuralları (varsayım eşikleri):

| Durum | Eylem |
| --- | --- |
| Harcama günlük bütçenin %50'sinden az | Teklifi yükselt veya kelime ekle |
| Bütçe öğleden önce bitiyor | Teklifi düşür |
| 20 dokunuş sonrası 0 kurulum (bir kelime) | Kelimeyi durdur |
| Dokunma oranı çok düşük ve gösterim yüksek | Alakasız arama: negatif ekle, sayfa mesajını kontrol et |
| Kurulum var ama ilk varlığı ekleyen az | Sorun reklamda değil ilk açılış akışında; ürünü düzelt |
| Bir kelime CPI'ı ortalamanın belirgin altında | Teklifini artır, bütçe payını büyüt |

## 8. Ay sonu raporu (gün 28)

Çıkarılacak cevaplar:

1. Toplam harcama, kurulum, CPI.
2. En iyi 5 kelime (kurulum ve ilk varlık başı maliyete göre).
3. En kötü 5 kelime (negatife ya da durdurmaya).
4. Kazanan özel ürün sayfası.
5. Kurulumdan ilk varlığa dönüşüm oranı.
6. Reklamla gelen kullanıcıların 7. gün geri dönüş oranı (veri varsa).
7. Ay içinde en çok kurulum getiren hafta günü ve saat (varsa; gün bazlı teklif ayarı için).

## 9. Ay sonu karar ağacı

| Sonuç | Karar |
| --- | --- |
| İlk varlık başı maliyet makul ve düşüyor | Bütçeyi kademeli artır (örn. 5-8 USD/gün); kazanan kelimeleri ayrı kampanyaya al; marka kampanyası ekle |
| CPI iyi ama ilk varlık ekleyen çok az | Reklamı durdur; önce ilk açılış akışını düzelt, sonra yeniden başla |
| CPI yüksek, tıklama oranı düşük | Kelime ve mağaza sayfası mesajını yenile; başka kanallara (bkz. `REKLAM_VE_BUYUME.md`) geç |
| Veri çok az (örn. onlarca gösterim) | Bütçe fazla düşük ya da kelimeler az arama alıyor: kelime ekle veya birkaç hafta daha çalıştır |

"Makul maliyet", Pro abonelik geliri ve ortalama kullanıcı değeri bilinmeden tanımlanamaz.
Kabul edilebilir ilk varlık başı maliyet, tahmini aylık Pro geliri ve dönüşüm oranıyla
hesaplanmalıdır; bu belgede sayısal eşik **önerilmez**.

## 10. Hatalar ve dikkat edilecekler

- Öğrenme döneminde (ilk 3-4 gün) teklifi sık değiştirme.
- Bütçeyi birden fazla kampanyaya bölme; 3 USD ile tek kampanya yeterlidir.
- Aynı anda hem sayfayı hem kelimeyi değiştirme; sonucun nedeni anlaşılmaz.
- "Kesin kazanç", "garanti", "para kazandırır" gibi ifadeler kullanma; Apple finans reklamlarını
  sıkı denetler. Uygulamanın kendi ifadesi: "Yatırım tavsiyesi değildir".
- Rakip marka adlarını kelime olarak ilk ayda kullanma.
- Kampanya toplam bütçesini 90 USD'ye sabitle ki yanlışlıkla fazla harcama olmasın.
- Apple Ads panelindeki kurulum sayısı ile uygulamanın kendi analitiği tam eşleşmeyebilir
  (atıf penceresi ve gizlilik kısıtları); karar verirken ikisini birlikte oku.

## 11. Kısa kontrol listesi

- [ ] Analitik: kurulum ve ilk varlık ekleme olayları açık
- [ ] Mağaza sayfası: başlık, alt başlık, ekran görüntüleri, yeni ikon
- [ ] P1 ve P2 özel ürün sayfaları hazır
- [ ] Kampanya: 3 USD/gün, toplam 90 USD, Türkiye, iPhone
- [ ] Reklam grupları A, B, C ve kelime listeleri
- [ ] Negatif kelimeler eklendi
- [ ] Gün 7, 14, 21, 28 değerlendirme tabloları dolduruldu
- [ ] Ay sonu raporu ve karar (bölüm 9)
