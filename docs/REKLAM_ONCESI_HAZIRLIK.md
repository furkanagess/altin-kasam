# Reklam açmadan önce: uygulama içi ve mağaza hazırlığı

Sırayla ilerle. Her adımın yanında **Kim** sütunu var: `Kod` = projeye zaten eklendi (yeniden
yapman gerekmez), `Sen` = senin yapman gereken hesap, mağaza ya da panel işi.

Hedef: kullanıcı geldiğinde (1) ölçülebilsin, (2) mağaza sayfasında ikna olsun, (3) uygulamada
ilk değeri görüp kaybolmasın. Bunlar tamamlanmadan reklam bütçesi harcama.

## A. Uygulama içi (kodda yapılanlar)

| # | Konu | Kim | Durum |
| --- | --- | --- | --- |
| A1 | Analitik altyapısı (PostHog) | Kod | Eklendi: `src/data/datasources/analyticsDatasource.ts` |
| A2 | Olaylar: açılış, ekran, onboarding, varlık ekleme, alarm kurma/tetiklenme, paylaşım, paywall, Pro | Kod | Bağlandı |
| A3 | Mağaza puanı isteme (ilk alarm tetiklenince, bir kez) | Kod | Eklendi: `reviewDatasource.ts` |
| A4 | Paylaşım görselinin altına "Altın Kasam ile takip ediyorum · mağaza adresi" | Kod | Eklendi; adres tanımlıysa görünür |
| A5 | Analitik anahtarı ve mağaza adresi | **Sen** | Aşağıda B1, B2 |


## A+. Onboarding, paywall ve puan isteme kuralları (kodda)

**Onboarding** (`app/onboarding.tsx`): üç kısa sayfa, sonra isteğe bağlı hedef. Her sayfada tek fikir:
canlı fiyat, kasa ve getiri, fiyat alarmı. Sağ üstte her an "Atla" var; hesap ya da izin istenmez.
Bildirim izni yalnızca ilk alarm kurulurken istenir.

**Paywall ve puan istemi** yalnızca kullanıcının değer gördüğü anlarda düşünülür
(`src/data/datasources/promptsDatasource.ts`; sayılar `PROMPT_RULES` içinde değişir):

| Kural | Değer |
| --- | --- |
| İlk oturumlarda hiçbir şey istenmez | En az 3 oturum ve kurulumdan 2 gün sonra |
| Pro tanıtımı (yumuşak paywall) | Alarm kurulunca ya da 2. varlıktan sonra; en çok 3 kez; iki gösterim arası en az 7 gün; Pro kullanıcıya hiç |
| Puan isteği | İlk alarm tetiklenince ya da 3. varlıktan sonra; bir kez; son paywall'dan en az 1 gün sonra |
| Aynı anda ikisi | Hayır; olumlu an olduğu için puan önceliklidir |
| Puan iki adımlı | "Memnun musun?" → Evet: sistem puan penceresi; Pek değil: geri bildirim e-postası (`EXPO_PUBLIC_SUPPORT_EMAIL`) |

Limit duvarları (ücretsiz alarm ve varlık sınırı, Pro özellik kilitleri) eskisi gibi çalışır; bu
kurallar onların yerine değil, yanına eklenmiştir. Yeni olaylar: `onboarding_step`, `prompt_shown`.

Gönderilen olaylar (kişisel ya da parasal veri **yok**; miktar, tutar, not, e-posta gönderilmez):

| Olay | Nitelikler |
| --- | --- |
| `app_opened` | yok |
| `screen_viewed` | ekran yolu (ör. `/alarm`) |
| `onboarding_completed` | hedef belirlendi mi |
| `holding_added` | grup (altın, metal, nakit), ilk varlık mı |
| `alarm_created` | fiyat ya da yüzde modu, not var mı, ilk alarm mı |
| `alarm_triggered` | kaynak (cihazda) |
| `share_card_shared` | başarılı mı |
| `paywall_viewed` | neden (alarm, weekly, holdings…) |
| `pro_purchased`, `pro_restored` | yok |

Ek: PostHog kendi başına kurulum ve oturum olaylarını (uygulama açıldı, yüklendi, güncellendi)
da gönderir. Ekran ve dokunma kaydı kapalıdır.

> Sunucu tarafında tetiklenen alarm (uygulama kapalıyken) bu sürümde `alarm_triggered` olarak
> sayılmaz, çünkü uygulama bunu açılışta öğrenir. İstersen sonra eklenir.

## B. Yapman gerekenler, adım adım

### B1. PostHog hesabı ve anahtar (≈10 dk)

1. https://posthog.com adresinde hesap aç. Bölge olarak **EU** seç (kullanıcılar Türkiye'de,
   veri AB'de kalır) ya da US.
2. Proje oluştur: ad "Altın Kasam".
3. **Project settings → Project API key** değerini kopyala (`phc_…` ile başlar; herkese açık
   bir anahtardır).
4. Yerelde `.env.local` dosyasına ekle:
   ```
   EXPO_PUBLIC_POSTHOG_KEY=phc_...
   EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
   ```
   (US seçtiysen `https://us.i.posthog.com`.)
5. EAS derlemeleri için aynı iki değeri EAS ortam değişkeni olarak ekle (`plaintext` ya da
   `sensitive` olur; bunlar herkese açık değerlerdir; komut `env:set` ile oluşturur ya da günceller):
   ```bash
   npx eas-cli@latest env:set --name EXPO_PUBLIC_POSTHOG_KEY --value phc_... --environment production --visibility plaintext
   npx eas-cli@latest env:set --name EXPO_PUBLIC_POSTHOG_HOST --value https://eu.i.posthog.com --environment production --visibility plaintext
   ```
6. **Yeni bir native build al** (`eas build`). `expo-localization` eklentisi ve yeni paketler
   (`posthog-react-native`, `expo-store-review`, `expo-application`, `expo-device`) native
   kod ekler; OTA güncellemesi yetmez.
7. Test: uygulamayı aç, bir varlık ekle, bir alarm kur. PostHog → **Activity** ekranında
   olaylar birkaç saniye içinde görünmeli. Görünmüyorsa anahtar ve host değerlerini kontrol et.

### B2. Mağaza adresi (yayından sonra)

Uygulama App Store'da yayına girince adresi al (`https://apps.apple.com/tr/app/…/id…`) ve
`.env.local` ile EAS'a `EXPO_PUBLIC_STORE_URL` olarak ekle. Paylaşım görselinin altında
görünür. Yayında değilse boş bırak; satır gizlenir.

### B3. PostHog'da huni (funnel) kur (≈10 dk)

PostHog → **Product analytics → New insight → Funnel**. Adımlar:

1. `app_opened`
2. `onboarding_completed`
3. `holding_added`
4. `alarm_created`
5. `paywall_viewed`
6. `pro_purchased`

Bu huni, reklamın getirdiği kullanıcıların nerede kaybolduğunu gösterir. Ayrıca iki ek görünüm:

- **Retention** (tutunma): ilk olay `onboarding_completed`, geri dönüş olayı `app_opened`;
  gün 1, 7, 30.
- **Trend:** `share_card_shared` ve `alarm_created` haftalık sayıları.

### B4. Reklam öncesi eşik değerleri (kendin belirle)

Reklamı açmadan önce, birkaç gün gerçek kullanıcıyla (arkadaşlar, ilk organik kullanıcılar)
şu iki sayıya bak:

| Ölçü | Anlamı | Ne yap |
| --- | --- | --- |
| Kurulum → ilk varlık ekleme | Kullanıcı ilk değeri görüyor mu | Düşükse ilk açılış akışını düzelt, reklam açma |
| 7. gün geri dönüş | Uygulama elde tutuyor mu | Düşükse reklam parası boşa gider |

Bu belgede **eşik sayısı vermiyorum**: gerçek veri olmadan uydurma bir hedef yanıltır. İlk
verinle kendi eşiğini yaz.

## C. Apple App Store Connect (mağaza sayfası), adım adım

Hepsi **Sen**. https://appstoreconnect.apple.com → uygulamanı seç → **App Store** sekmesi.

### C1. Ad, alt başlık ve anahtar kelimeler

| Alan | Limit | Öneri (örnek; kendi metnine uyarla) |
| --- | --- | --- |
| Ad | 30 karakter | `Altın Kasam: Altın Fiyatı` |
| Alt başlık | 30 karakter | `Gram, çeyrek, alarm, takip` |
| Anahtar kelimeler | 100 karakter, virgülle | `altın,gram altın,çeyrek,ziynet,gümüş,alarm,takip,birikim,kasa,canlı fiyat,portföy` |

İpuçları:
- Anahtar kelime alanında ad ve alt başlıktaki kelimeleri **tekrar etme**; Apple onları zaten
  indeksler. Kelimeler arasına boşluk koyma.
- Çoğul ya da tekil iki biçimi yazmaya gerek yok.
- Rakip marka adı yazma; mağaza incelemesinde sorun olur.

### C2. Açıklama ve "Yenilikler"

- Açıklamanın **ilk 3 satırı** önemlidir (devamı gizlenir): "Elindeki altının bugün kaç TL
  ettiğini ve ne kadar kazandığını gör. Fiyat alarmı kur, hedefe gelince haber alalım."
- "Kesin kazanç", "garanti", "yatırım tavsiyesi" ifadeleri yok. Sonda "Yatırım tavsiyesi
  değildir." yaz.
- Pro özelliklerini kısaca listele; ücretsiz kısmın değerli olduğunu belirt.

### C3. Ekran görüntüleri (en önemli dönüşüm etkeni)

6,9" (iPhone 16 Pro Max / 17 Pro Max sınıfı) çözünürlük zorunludur; diğer boyutlar ondan
türetilir. İlk **3** görüntü reklamda ve aramada en çok görünür:

| Sıra | İçerik | Başlık metni (örnek) |
| --- | --- | --- |
| 1 | Piyasa ekranı: canlı fiyat, saat | `Canlı altın fiyatı, tek bakışta` |
| 2 | Alarm kurma ekranı | `Hedef fiyata gelince haber ver` |
| 3 | Kasa ekranı: toplam getiri | `Altınının getirisini gör` |
| 4 | Haftalık analiz | `Haftalık piyasa analizi` |
| 5 | Altın çeşitleri (ziynet) | `Çeyrek, yarım, tam, bilezik` |

Yapım: simülatörde uygulamayı aç, ekranı kaydet; üstüne kısa başlık ekle. Basit bir tasarım
aracı yeterli. Gerçek veriyle çekilmiş, tutarsız rakamlar içermeyen görüntüler kullan.

### C4. Uygulama ikonu

Yeni kasa ikonu (`assets/images/icon.png`) yeni build'le gelir. Build'i yükledikten sonra
mağaza sayfasında ikonun yeni olduğunu doğrula.

### C5. Gizlilik ve yasal bağlantılar

1. **App Privacy** bölümünde analitik veri toplandığını işaretle: "Kullanım verileri → Ürün
   etkileşimi" (analiz amaçlı, kullanıcıya bağlı değil ya da cihaz kimliğine bağlı olarak
   doğru olanı seç). Kimlik, konum, finansal hesap verisi toplanmadığını doğrula.
2. **Gizlilik politikası URL'si** ve **Kullanım koşulları** gerekli: taslaklar `docs/legal/`
   içinde. Yayımladığın adresleri `.env.local` ve EAS'a `EXPO_PUBLIC_PRIVACY_URL` ve
   `EXPO_PUBLIC_TERMS_URL` olarak ekle.
3. Yaş derecelendirmesi ve finans uygulaması beyanlarını doldur. Uygulama yatırım tavsiyesi
   vermediğini, fiyat kaynağını ve uyarıyı açıkça belirt.

### C6. Abonelik (Pro) sayfası

App Store Connect → Abonelikler:
- Ad, açıklama ve **gerçek fiyatlar** (aylık, yıllık) RevenueCat ile aynı olmalı.
- Abonelik grubu için yerelleştirilmiş görünen ad ve açıklama gir.
- **Ücretsiz deneme** eklemeyi düşün (3-7 gün); dönüşümü artırabilir. Önce bir kez gerçek
  cihazda sandbox ile satın almayı test et.

### C7. Özel Ürün Sayfaları (reklamdan önce hazır olsun)

App Store Connect → **Özel Ürün Sayfaları → Yeni**. İki sayfa:

| Sayfa | Farklı olan | Bağlanacağı reklam grubu |
| --- | --- | --- |
| P1 Fiyat | İlk ekran görüntüsü canlı fiyat | Altın fiyatı |
| P2 Alarm ve kasa | İlk ekran görüntüsü alarm | Ziynet ve takip |

Apple onayı birkaç gün sürebilir; reklamdan en az bir hafta önce gönder.

### C8. Sürüm notları ve TestFlight

- Yayın öncesi TestFlight ile birkaç kişiye (5-10) ver; ilk açılış akışını ve alarmı gerçek
  cihazlarda denetlesinler. B4'teki iki sayıyı bu grupla ölç.
- Yayın sonrası hızlı çökme ya da hata olursa reklamı hemen durdur.

## D. Google Play Console (Android için)

Android'de reklam açmayacaksan şimdilik atlanabilir; ileride Google Ads uygulama kampanyası
için gerekir.

1. **Mağaza girişi:** başlık (30), kısa açıklama (80), tam açıklama; anahtar kelimeler
   açıklamanın içinde doğal geçsin.
2. **Grafikler:** 512×512 ikon (yeni kasa ikonu), 1024×500 öne çıkan görsel, telefon ekran
   görüntüleri (en az 2, tercihen 5-8).
3. **Veri güvenliği** formunu doldur (analitik: uygulama etkileşimi).
4. **Abonelikler:** Play Console'da ürünleri aç, RevenueCat'te Android anahtarını bağla.

## E. Yayın öncesi son kontrol listesi

- [ ] PostHog anahtarı ve host `.env.local` ve EAS'ta tanımlı
- [ ] Yeni native build alındı ve cihazda olaylar PostHog'da görünüyor
- [ ] PostHog'da huni ve tutunma görünümleri kuruldu
- [ ] Kurulum → ilk varlık ve 7. gün geri dönüş **kendi eşiğinle** ölçüldü
- [ ] App Store adı, alt başlığı, anahtar kelimeleri güncel
- [ ] Açıklamanın ilk 3 satırı ve "yatırım tavsiyesi değildir" notu
- [ ] 5 ekran görüntüsü (ilk 3 en güçlü) yüklendi
- [ ] Yeni kasa ikonu mağazada görünüyor
- [ ] App Privacy ve yaş derecelendirmesi dolduruldu
- [ ] Gizlilik politikası ve kullanım koşulları adresleri yayında ve `EXPO_PUBLIC_*` ile bağlı
- [ ] Abonelik fiyatları App Store Connect ve RevenueCat'te aynı; sandbox satın alma denendi
- [ ] Özel Ürün Sayfaları P1 ve P2 gönderildi ve onaylandı
- [ ] `EXPO_PUBLIC_STORE_URL` yayından sonra eklendi
- [ ] Reklam planı: `SEARCH_ADS_1_AYLIK_PLAN.md`

Bu liste tamamlanınca `SEARCH_ADS_1_AYLIK_PLAN.md`'deki 1. günü başlat.
