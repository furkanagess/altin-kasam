# Altın Kasam Gizlilik Politikası

Son güncelleme: 17.11.2026

Bu politika, Furkan Çağlar ("biz") tarafından sunulan Altın Kasam mobil uygulamasının ("Uygulama")
hangi verileri, neden ve nasıl işlediğini açıklar. 6698 sayılı Kişisel Verilerin Korunması Kanunu
("KVKK") kapsamında veri sorumlusu Furkan Çağlar'dır. İletişim: altinkasamapp@gmail.com

## 1. Kısaca

- Hesap açmak **zorunlu değildir**. Hesap olmadan da Uygulama'yı kullanabilirsin; kasan, hedefin ve
  alarmların cihazında durur.
- İstersen Google veya Apple ile hesabını bağlayıp verini yedekleyebilir, başka cihazda geri
  yükleyebilirsin. Bu yalnızca sen bağladığında çalışır.
- Reklam göstermeyiz, seni uygulamalar ve siteler arasında izlemeyiz, verini satmayız.
- Analitik yalnızca olay adı ve genel bilgi içerir; miktar, tutar, not ya da e-posta göndermez.

## 2. Cihazında saklanan veriler

Aşağıdakiler cihazının yerel depolamasında tutulur ve Uygulama'yı sildiğinde silinir:

- Kasandaki varlıklar (tür, miktar, alış fiyatı ve tarihi)
- Yatırım hedefi
- Fiyat alarmları ve ekonomik takvim hatırlatmaları
- Okunan haberler, takip edilen kaynaklar, ana ekran widget'ı seçimi
- Tema tercihi ve son fiyatların önbelleği
- Cihaza özgü rastgele bir kurulum kimliği (isim, e-posta veya telefonla ilişkisi yoktur)

## 3. Sunucularımıza gönderilen veriler

Sunucularımız Google Firebase (Cloud Functions, Firestore, Authentication) üzerinde çalışır.

**a) Hesap bağlama ve yedekleme (isteğe bağlı).** Google veya Apple ile giriş yaptığında Firebase
Authentication sana bir kullanıcı kimliği oluşturur ve giriş sağlayıcının verdiği e-posta adresi ile
adı (varsa) işler. Kasa, hedef, alarm ve tercihlerinin yedeği bu kimliğe bağlı olarak Firestore'da
saklanır. Uygulama Firestore'a doğrudan erişmez; her istek kimlik jetonuyla doğrulanır. Yedeği ve
hesabını istediğin an Ayarlar'dan silebilirsin; silince sunucudaki yedek de silinir.

**b) Sunucu tarafı fiyat alarmı.** Uygulama kapalıyken alarmın çalışabilmesi için alarm bilgileri
(hedef fiyat, bildirim metni), kurulum kimliğin ve bildirim jetonun (push token) sunucuya gönderilir.
Alarm tetiklenip bildirim gönderildikten bir süre sonra kayıt silinir; geçersiz bildirim jetonları
otomatik temizlenir.

**c) Destek mesajları.** Ayarlar > Destek'ten mesaj gönderdiğinde mesaj metni, yazdıysan dönüş e-postan,
kurulum kimliğin, uygulama sürümü, işletim sistemi ve cihaz modeli bize ulaşır ve destek gelen
kutumuza iletilir. Bunları yalnızca talebini yanıtlamak için kullanır, talep sonrasında makul bir
süre içinde sileriz. Kötüye kullanımı sınırlamak için kurulum kimliğinden türetilen sayaç tutulur.

**d) Fiyat, grafik, takvim ve haber istekleri.** Bu isteklerde her internet bağlantısında olduğu gibi
IP adresin ve cihaz/uygulama türü karşı sunucuya ulaşır. Bu isteklerden profil çıkarmayız.

## 4. Üçüncü taraf hizmetler

| Hizmet | Amaç | Aktarılan veri |
| --- | --- | --- |
| Google Firebase | Sunucu, hesap, yedek, bildirim | Bölüm 3'te anlatılanlar |
| Google / Apple ile giriş | İsteğe bağlı hesap bağlama | Kimlik doğrulama jetonu, e-posta, ad |
| Expo (EAS Hosting, bildirim servisi) | Uygulamanın sunucu uçları, bildirim iletimi | Teknik istek verisi, bildirim jetonu |
| RevenueCat, Inc. | Pro abonelik doğrulama | Anonim kullanıcı kimliği, satın alma geçmişi, cihaz/OS bilgisi |
| Apple App Store / Google Play | Abonelik ödemesi | Ödeme bilgilerini biz görmeyiz |
| PostHog (AB bölgesi) | Ürün analitiği | Olay adı (ör. ekran görüntüleme, satın alma) ve genel nitelikler; ekran kaydı yok |
| Hasfiyat, Yahoo Finance, TCMB, FRED vb. | Fiyat, grafik ve takvim verisi | Sunucumuz üzerinden alınır; kişisel veri gönderilmez |
| Yayıncı RSS akışları, Bluesky | Haber ve topluluk akışı | Teknik istek verisi (IP) |

Bir haberi veya resmî kaynağı Uygulama içinde açtığında ilgili site kendi gizlilik politikası ve
çerezleri çerçevesinde çalışır. Üçüncü tarafların kendi politikaları geçerlidir.

## 5. Analitik

Ürünü iyileştirmek için PostHog ile anonim kullanım olayları toplarız (uygulama açılışı, ekran
görüntüleme, alarm kuruldu, satın alma gibi). Varlık miktarı, tutar, not metni ve e-posta gibi kişisel
veya parasal veri analitiğe **gönderilmez**. Ekran ve dokunma kaydı alınmaz.

## 6. Verilerin işlenme amacı ve hukuki sebebi

- Hizmetin sunulması, yedek ve alarm (KVKK m.5/2-c, sözleşmenin ifası)
- Abonelik ve ödeme doğrulama (m.5/2-c ve hukuki yükümlülük m.5/2-ç)
- Analitik, güvenlik ve kötüye kullanımın önlenmesi (m.5/2-f, meşru menfaat)
- Destek taleplerinin yanıtlanması (m.5/2-c ve m.5/2-f)
- Bildirim izni ve hesap bağlama gibi isteğe bağlı özellikler (m.5/1, açık rıza; istediğin an geri
  alabilirsin)

## 7. Saklama süresi

Cihazdaki veriler Uygulama'yı silene kadar kalır. Hesap yedeği, hesabını silene kadar saklanır.
Tetiklenmiş alarmlar kısa süre sonra silinir. Destek yazışmaları talep sonrası makul bir süre
saklanır. Yasal yükümlülükler (ör. abonelik kayıtları) mağaza ve RevenueCat tarafında kendi
politikalarına göre tutulur.

## 8. Yurt dışına aktarım

Google (Firebase), Expo, RevenueCat, PostHog, Apple ve Google Play sunucuları yurt dışında
olabilir. Bu aktarımlar KVKK m.9 kapsamındaki şartlara uygun olarak yapılır.

## 9. Haklarınız

KVKK m.11 uyarınca verinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltme, silme, işlemeye
itiraz etme ve zarar hâlinde tazminat isteme haklarına sahipsin. Şunları kendin yapabilirsin:

- Hesabını ve sunucudaki yedeğini Uygulama içinden silmek,
- Bildirim iznini cihaz ayarlarından kapatmak,
- Cihazdaki verileri Uygulama'yı silerek kaldırmak.

Diğer talepler için altinkasamapp@gmail.com adresine yazabilirsin.

## 10. Güvenlik

Aktarımlar HTTPS ile yapılır; hesap istekleri Firebase kimlik jetonuyla doğrulanır ve servis
anahtarları Uygulama içinde değil yalnızca sunucuda tutulur. Hiçbir yöntem mutlak güvenlik
sağlamaz.

## 11. Çocuklar

Uygulama 18 yaşından küçüklere yönelik değildir ve bilerek çocuklardan veri toplamaz.

## 12. Yatırım tavsiyesi değildir

Uygulamadaki fiyat, analiz ve yorumlar bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.

## 13. Değişiklikler

Bu politikayı güncellediğimizde yeni sürümü bu sayfada ve tarihini yukarıda yayımlarız.

## 14. İletişim

Furkan Çağlar · altinkasamapp@gmail.com
