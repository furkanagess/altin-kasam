# Mağaza Künyesi (ASO): Ad, Alt Başlık, Anahtar Kelimeler, Kategori

Altın Kasam için App Store ve Google Play'e girilecek ad, alt başlık, anahtar kelime ve kategori kararları. Karakter sayıları ölçüldü (Türkçe karakterler tek sayılır).

Son güncelleme: 17 Kasım 2026

---

## App Store (iOS)

| Alan | Metin | Karakter |
| --- | --- | --- |
| **Name** (en çok 30) | `Altın Kasam: Gram Altın Fiyatı` | 30 |
| **Subtitle** (en çok 30) | `Çeyrek, Gümüş, Alarm, Portföy` | 29 |
| **Keywords** (en çok 100) | `canlı,ons,dolar,döviz,takvim,fed,tcmb,faiz,enflasyon,analiz,birikim,bilezik,kuyumcu,yarım,widget` | 96 |
| **Primary category** | **Finance** (Finans) | |
| **Secondary category** | **Utilities** (Araçlar) | |

### Neden bu metinler

- Apple, **ad + alt başlık + anahtar kelime** alanlarındaki kelimeleri birlikte arar ve kelimeleri birleştirerek eşleştirir. Bu yüzden hiçbir kelime iki alanda tekrar edilmedi; 100 karakterlik alan başka kelimelere ayrıldı.
- **Ad:** Marka (`Altın Kasam`) + Türkiye'de en çok aranan sorgu (`gram altın fiyatı`). Marka kelimeleri (`altın`, `kasam`) zaten adda olduğu için ayrıca aranmaz.
- **Alt başlık:** Ad ile çakışmayan, arama hacmi olan ve özelliği anlatan dört kelime: `çeyrek` (ziynet aramaları), `gümüş`, `alarm` (öne çıkan özellik), `portföy` (kasa özelliği).
- **Keywords:** Ad ve alt başlıkta olmayan, doğrudan arama niyeti taşıyan kelimeler:
  - Fiyat ve döviz: `canlı`, `ons`, `dolar`, `döviz`
  - Takvim ve ekonomi: `takvim`, `fed`, `tcmb`, `faiz`, `enflasyon`, `analiz`
  - Ürün: `birikim`, `bilezik`, `kuyumcu`, `yarım`, `widget`
  - Virgülden sonra boşluk bırakılmadı; çoğul ya da ek halleri yazılmadı (Apple kök eşleştirir, alan boşa harcanmaz).
- **Cumhuriyet, platin, paladyum** gibi daha düşük hacimli kelimeler için 100 karakterlik alan yetmedi; açıklama metninde geçiyorlar (aşağıdaki isteğe bağlı değişiklik).

### Kategori kararı

- **Primary: Finance.** Uygulama canlı fiyat, portföy kâr/zarar, ekonomik takvim ve alarm içeriyor; kullanıcı beklentisi ve mağaza arama niyeti Finans'ta. Rakipler de bu kategoride.
- **Secondary: Utilities.** Fiyat alarmı, ana ekran widget'ı ve hızlı kontrol özellikleri "araç" kullanımına uyuyor; ayrıca Finans listesinde görünmeyen kullanıcılara ikinci bir keşif alanı açıyor.
- Değerlendirilip seçilmeyenler: **News** (haber akışı var ama News kategorisi editoryal içerik ister, inceleme riski taşır), **Business** (kullanıcı kitlesi bireysel yatırımcı, işletme değil).

### İsteğe bağlı değişiklikler (test edilebilir)

- Ad alternatifi: `Altın Kasam: Altın Fiyatları` (28). `fiyatları` çoğul halini yakalar, ama `gram` kelimesini alt başlığa taşıman gerekir (örn. `Gram, Çeyrek, Gümüş ve Alarm`, 28).
- Keywords: `yarım,widget` yerine `cumhuriyet` (10 karakter) eklenebilir; toplam 94 kalır.

---

## Google Play

| Alan | Metin | Karakter |
| --- | --- | --- |
| **Title / App name** (en çok 30) | `Altın Kasam: Altın Fiyatları` | 28 |
| **Short description** (en çok 80) | `Canlı gram altın, çeyrek ve gümüş fiyatları. Alarm, portföy, Fed ve TCMB takvimi` | 80 |
| **Category** | **Finance** (Finans) | |
| **Tags** (en çok 5, Play Console'da listeden seçilir) | Finans, yatırım ve piyasa ile ilgili etiketler | |

### Notlar

- Google Play'de **alt başlık yoktur**; karşılığı **Short description**'dır (80 karakter) ve aramada ağırlıklı kullanılır. Anahtar kelime alanı da yoktur: kelimeler **başlık, kısa açıklama ve uzun açıklamadan** çıkarılır.
- Başlıkta `Altın Fiyatları` (çoğul) kullanıldı; iOS'taki `Fiyatı` ile birlikte iki kelime biçimi de kapsanmış olur.
- Play politikası başlıkta fiyat, indirim, sıralama ve "en iyi" gibi ifadeleri yasaklar; bu başlık uygun.
- Kısa açıklamada kelime tekrarına gerek yok: `altın` ve `fiyatları` bir kez geçiyor.
- Uzun açıklamayı [APP_STORE_METINLERI.md](APP_STORE_METINLERI.md) içindeki metinden uyarlayabilirsin; aynı kelimeleri (özellikle `altın fiyatları`, `gram altın`, `çeyrek altın`, `fiyat alarmı`, `ekonomik takvim`, `Fed`, `TCMB`) doğal cümleler içinde 3–5 kez geçir.
- Play kategorisi tek seçilir (ikinci kategori yoktur): **Finance**.

---

## Girmeden önce kontrol listesi

- [ ] App Store Connect: Name, Subtitle, Keywords alanlarına yukarıdaki metinler yapıştırıldı.
- [ ] App Store Connect → App Information: Primary = Finance, Secondary = Utilities.
- [ ] Google Play Console: Title, Short description, Category = Finance, etiketler seçildi.
- [ ] Ekran görüntüleri [store-assets/screenshots/](../store-assets/screenshots/) altından yüklendi; başlıkları [APP_STORE_METINLERI.md](APP_STORE_METINLERI.md) içindeki tabloda.
- [ ] İki mağazada da gizlilik politikası adresi girildi ([docs/legal/gizlilik-politikasi.md](legal/gizlilik-politikasi.md) yayımlandıktan sonra).
- [ ] 1–2 hafta sonra App Store Connect / Play Console arama istatistiklerine bakılıp keywords ve alt başlık güncellendi.
