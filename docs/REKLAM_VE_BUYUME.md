# Altın Kasam: Reklam ve büyüme planı

Amaç: kullanıcı ve Pro abone sayısını, kontrollü bütçeyle artırmak.

> Bu belgedeki bütçe, teklif ve oran değerleri **başlangıç örnekleridir**, ölçülmüş veri değildir.
> İlk iki haftanın verisiyle güncellenmelidir. Garanti verilen bir sonuç yoktur: önce küçük
> bütçeyle test et, işe yarayanı büyüt.

## 1. Hedef kitle ve ana mesaj

- **Kim:** Türkiye'de altını birikim aracı olarak tutan insanlar: çeyrek, gram, bilezik, düğün
  takısı. Kripto ya da borsa takipçisi değil, kuyumcudan fiziksel altın alan sıradan kullanıcı.
- **Ana cümle:** "Elindeki altının bugün kaç TL ettiğini ve ne kadar kazandığını gör."
- **En çekici özellik:** Fiyat alarmı ("Gram altın 3.500 TL olunca haber ver").
- **Dil:** "Kesin kazanç", "garanti" gibi ifadeler kullanılmaz. Uygulama "Yatırım tavsiyesi
  değildir" der; reklam ve videolar aynı çizgide kalır. Apple ve Google finans reklamlarında
  kuralları sıkı uygular.

## 2. Önce ürün tarafı (reklamdan daha çok etkiler)

| Alan | Yapılacak |
| --- | --- |
| Paylaşım görseli | Kasa getiri kartı en iyi büyüme aracıdır; üstünde uygulama ikonu ve adı var. Altına "Altın Kasam ile takip ediyorum" ve mağaza bağlantısı eklenir. Paylaşım ücretsiz planda şu an 1 deneme; artırmak değerlendirilir. |
| İlk açılış | Kullanıcı ilk dakikada ilk varlığını eklemeli. Bu adımdaki kayıp ölçülür. |
| Alarm | Ücretsiz planda 1 alarm var; reklamlarda öne çıkarılır. Pro'ya geçişi en çok bu tetikler. |
| Puan isteme | İlk alarm tetiklendikten sonra memnun kullanıcıdan mağaza puanı istenir. |

## 3. Ücretsiz büyüme kanalları

1. **Kısa video (TikTok, Reels, Shorts), 15-30 sn ekran kaydı.** Örnek fikirler:
   - "Annemin 20 çeyreği bugün ne kadar ediyor?"
   - "Altın alarmı kurdum, 3 gün sonra bildirim geldi."
   - "1 yıl önce aldığım altın şimdi ne kadar?"
   - Kasa kapısının açılıp içine altın girdiği animasyon görsel olarak iyi çekimdir.
2. **Haftalık analiz içeriği.** Herkese açık haftaların özeti X/Twitter ve Telegram'da
   paylaşılır. "Bu hafta Fed ve TCMB ne açıklıyor" gibi takvim içeriği ilgi çeker.
3. **Küçük influencer'lar (5-50 bin takipçi).** Birikim ve kişisel finans anlatanlar. Sabit ücret
   yerine kurulum ya da kod başına ödeme tercih edilir.
4. **Forum ve gruplar.** Ekşi Sözlük, Reddit (r/Turkey, r/yatirim), altın ve borsa grupları.
   Açık reklam yerine soruya cevap verip uygulamayı doğal şekilde anmak; spam ters teper.

## 4. Apple Search Ads (Apple Ads) örnek şeması

Apple, reklam ürününün adını "Apple Ads" olarak değiştirmiş olabilir; panel adresi ve menü
adları zamanla değişir. Aşağıdaki yapı kavramsaldır.

### 4.1 Hesap yapısı

Dört kampanya, her biri ayrı bir amaca hizmet eder. Ülke: Türkiye. Cihaz: iPhone.

```
Hesap: Altın Kasam
├── K1  Marka          (kendi adını arayanları korur)
├── K2  Genel arama    (niyeti net kelimeler; ana kampanya)
├── K3  Rakip          (benzer uygulamaları arayanlar)
└── K4  Keşif          (yeni kelime bulma; geniş eşleşme)
```

### 4.2 Kampanya, reklam grubu ve anahtar kelimeler

**K1: Marka**

| Reklam grubu | Anahtar kelimeler (tam eşleşme) | Not |
| --- | --- | --- |
| Marka adı | altın kasam, altin kasam | Düşük maliyetli; marka aramasını rakibe kaptırmamak için. |

**K2: Genel arama (ana kampanya)**

| Reklam grubu | Anahtar kelimeler (tam eşleşme) |
| --- | --- |
| Altın fiyatı | altın fiyatı, altın fiyatları, canlı altın, gram altın, gram altın fiyatı |
| Ziynet | çeyrek altın, çeyrek altın fiyatı, cumhuriyet altını, yarım altın, tam altın, bilezik fiyatı |
| Takip ve alarm | altın takip, altın alarm, altın fiyat alarmı, altın portföy, altın hesaplama |
| Gümüş | gümüş fiyatı, gram gümüş, gümüş alarm |
| Kasa ve birikim | altın birikim, altın kasası, altın yatırım takibi |

**K3: Rakip**

| Reklam grubu | Anahtar kelimeler (tam eşleşme) | Not |
| --- | --- | --- |
| Altın uygulamaları | Piyasada bilinen altın fiyat uygulamalarının adları | Rakip marka adı kullanımı Apple ve ilgili markalar açısından hassastır; deneme bütçesi küçük tutulur ve hesap kuralları kontrol edilir. |

**K4: Keşif**

| Reklam grubu | Eşleşme | Not |
| --- | --- | --- |
| Geniş keşif | Geniş eşleşme + Search Match | Hangi aramaların kurulum getirdiğini bulmak için. Sonuçlar K2'ye tam eşleşme olarak taşınır. |

### 4.3 Negatif anahtar kelimeler (tüm kampanyalar)

Alakasız aramalar bütçeyi yer. Başlangıç listesi:

```
bedava altın, altın madeni oyun, altın oyunu, altın dişi, altın saat satın al,
altın kolye modelleri, altın iş ilanı, altın fiyatı geçmiş 2010,
kripto, bitcoin, forex
```

Her hafta "Arama terimleri" raporuna bakılır; kurulum getirmeyen ve alakasız terimler
negatife eklenir.

### 4.4 Örnek bütçe ve teklif (başlangıç; ilk 2 hafta)

| Kampanya | Günlük bütçe (örnek) | Teklif yaklaşımı |
| --- | --- | --- |
| K1 Marka | 50 TL | Düşük, sabit |
| K2 Genel arama | 250 TL | Önce önerilen teklif, sonra kurulum başı maliyete göre ayarla |
| K3 Rakip | 50 TL | Düşük; yalnızca test |
| K4 Keşif | 100 TL | Düşük; yalnızca veri toplamak için |
| **Toplam** | **450 TL / gün** | Daha düşük bütçeyle de başlanabilir |

### 4.5 Özel Ürün Sayfaları (Custom Product Pages)

Anahtar kelime grubuna göre farklı mağaza sayfası gösterilir; dönüşümü artırır.

| Reklam grubu | Sayfanın vurgusu |
| --- | --- |
| Altın fiyatı | Canlı fiyat ekranı, "anlık altın fiyatı" |
| Ziynet | Çeyrek, yarım, tam, bilezik fiyatları |
| Takip ve alarm | Fiyat alarmı ekranı, "hedef fiyata gelince haber ver" |
| Kasa ve birikim | Kasa getirisi ve paylaşım kartı |

### 4.6 Haftalık işletme rutini

1. Arama terimleri raporunu aç; kurulum getirenleri K2'ye **tam eşleşme** olarak ekle.
2. Kurulum getirmeyen ve alakasız terimleri negatife ekle.
3. Kurulum başı maliyeti yüksek anahtar kelimelerin teklifini düşür ya da durdur.
4. En iyi giden reklam grubunun bütçesini kademeli artır (tek seferde %20-30'dan fazla değil).
5. Özel ürün sayfalarını dönüşüm oranına göre karşılaştır.

## 5. Diğer ücretli kanallar

| Kanal | Kullanım |
| --- | --- |
| Google Ads (uygulama kampanyası) | Aynı anahtar kelime fikirleri; Android kurulumu için. |
| Meta ve TikTok reklamları | Organik videolardan en iyi giden, reklama çevrilir. |
| Küçük influencer ödemeleri | Kurulum ya da kod başına. |

Başlangıç: günlük 200-500 TL ile 1-2 hafta test. Kurulum başı maliyet ve o kurulumdan kaç
kişinin **ilk varlığı eklediği** ölçülür.

## 6. Mağaza sayfası (ASO)

- **Başlık:** "Altın Kasam: Altın Fiyatı ve Takip" gibi aranan kelimeleri içersin.
- **Ekran görüntüleri:** İlk üçü en önemlisi: canlı fiyat, kasa getirisi, alarm. Yeni ikon
  (kasa) öne çıkarılır.
- **Alt başlık / anahtar kelime alanı:** gram altın, çeyrek, alarm, takip, birikim.
- **Yorumlar:** Uygulama içinden memnun kullanıcıdan puan istenir (bkz. bölüm 2).

## 7. Abone (Pro) sayısını artırmak

- Pro'nun değeri ilk haftada görülmeli: alarm sınırı (ücretsiz 1) ve güncel haftalık analiz
  (güncel ve bir önceki hafta Pro) tetikleyicidir.
- Ücretsiz deneme süresi (3-7 gün) eklenir; RevenueCat destekler.
- Yıllık plan öne çıkarılır, "aylık X TL'ye geliyor" gösterilir.
- Piyasa sert hareket ettiğinde (rekor ya da ani düşüş) bildirimle Pro hatırlatılır; ilgi o
  günlerde en yüksektir.

## 8. Ölçüm

Ölçülecekler:

| Ölçü | Neden |
| --- | --- |
| Kurulum | Kanal başına maliyet (CPI) |
| İlk varlığı ekleyen oran | Reklamın kaliteli kullanıcı getirip getirmediği |
| 7. gün geri dönen oran | Ürün tutunması |
| Pro'ya geçen oran | Gelir |
| Kanal başına kullanıcı maliyeti ve abone başına maliyet | Bütçeyi nereye kaydıracağını belirler |

Bu ölçüleri görmeden reklam bütçesini artırma. Önce analitik (kurulum ve ilk varlık ekleme
olayları) kurulmalıdır.

## 9. Başlangıç takvimi (öneri)

| Hafta | Yapılacak |
| --- | --- |
| 0 | Analitik olayları, paylaşım kartına mağaza bağlantısı, mağaza sayfası ve ekran görüntüleri |
| 1-2 | Apple Ads K1, K2, K4 düşük bütçeyle; 3-5 kısa video yayımla |
| 3-4 | Arama terimlerinden K2'yi büyüt, negatifleri temizle, özel ürün sayfalarını test et |
| 5+ | En iyi kanalı kademeli büyüt, Google Ads ve influencer ekle |
