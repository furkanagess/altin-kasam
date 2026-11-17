# Hasfiyat REST isteklerini yöneten yapılar

Amaç: Hasfiyat REST kotasını ve maliyeti, kullanıcı deneyimini düşürmeden en aza indirmek.
Bu belge (1) hangi yapıların istek sayısını artırdığını, (2) yapılan değişiklikleri, (3) kalan
riskleri ve ölçüm yöntemini anlatır.

> Bu belgedeki sayılar kod ve sabitlerden **hesaplanmış üst sınırlardır**, ölçülmüş değildir.
> Hasfiyat paketinizin gerçek kotası ve Expo Hosting CDN'inin davranışı yayın sonrası
> "Ölçüm" bölümündeki adımlarla doğrulanmalıdır.

## 1. Hasfiyat'a giden istek kaynakları

Hasfiyat'a yalnızca **sunucu** gider (anahtar `HASFIYAT_API_KEY` sunucudadır). Uygulama kendi
sunucu uçlarını çağırır; kotadan düşen istek, sunucunun Hasfiyat'a attığı istektir.

| Sunucu ucu | Hasfiyat çağrısı | Kim çağırır | Eski davranış | Yeni davranış |
| --- | --- | --- | --- | --- |
| `/api/prices` | `prices?source=harem` (tek istek, tüm kalemler) | Her açık istemci, `POLL_INTERVAL_MS` aralığıyla | `no-store`; yalnızca işçi belleğinde 10 sn | CDN'de 20 sn (piyasa kapalıyken 5 dk) |
| `/api/history` | `prices/history` (kalem × periyot) | Piyasa ve çeşit grafikleri, rasyo grafiği | İşçi belleğinde 5 dk (saatlik) / 30 dk (günlük) | CDN'de 10 dk / 2 sa |
| `/api/alarm-values` | `/api/prices` ile aynı yükleyici | Firebase `checkAlarms` (en çok dakikada 1) | İşçi belleği | Aynı yükleyici; gizli uç, CDN'e alınmaz |
| `/api/history-long` | Yok (Yahoo) | Uzun dönem tamamlama | 6 sa işçi belleği | 6 sa CDN (Hasfiyat kotasına girmez) |

Hasfiyat'a gitmeyenler: ekonomik takvim, haber akışı, topluluk, ana ekran widget'ı (widget mevcut
fiyatı itmekten başka istek atmaz).

## 2. İstek sayısını en çok artırabilecek yapılar

Etki sırasıyla:

1. **Fiyat yoklaması × istemci × işçi.** Her açık istemci sabit aralıkla `/api/prices`'ı çağırır.
   Yanıt `no-store` olduğu için CDN paylaşmıyordu; önbellek yalnızca her işçinin (Cloudflare
   isolate) kendi belleğindeydi. Hasfiyat'a giden istek ≈ **çalışan işçi sayısı × 6/dk**. Kullanıcı
   artıp trafik daha çok işçiye dağıldıkça istek sayısı doğrusal büyür.
2. **Uzun açık kalan uygulamalar.** Yoklama arka planda durur ama ekran açık bırakılan cihaz günde
   binlerce istek üretir. Hafta sonu fiyat değişmese bile aynı hızda yoklanıyordu.
3. **Grafik başına çoklu seri.** Bir metal grafiği 1 ila 3 geçmiş serisi ister (kalem + USD/TL
   dönüşümü için; EUR'da bir tane daha). Platin ve paladyum ons fiyatındadır, kur serisi şarttır.
   Piyasa ekranı dört metalin hepsini birlikte yükler.
4. **Periyot ve para birimi anahtarları.** Önbellek anahtarı `kalem|periyot|başlangıç tarihi`.
   Her periyot yeni anahtar üretir: 6 temel seri (gram altın, gümüş, platin, paladyum, USD/TL,
   EUR/TL) × 5 periyot = 30 anahtar. Altın çeşidi detay grafikleri (ziynet vb.) kendi kalemleriyle
   anahtar sayısını artırır.
5. **Yenileme.** Seriler periyot/para birimi değişince ve her 5 dakikada bir yeniden çekiliyordu.
6. **Hata anında yeniden deneme fırtınası.** Hasfiyat hata verince yanıt önbelleğe alınmıyordu;
   her istemci yoklaması yine Hasfiyat'a gidiyordu (hata isteklerinin kotaya girip girmediği
   Hasfiyat sözleşmesine bağlı).
7. **Sunucu alarmı.** `checkAlarms` her dakika çalışır ama Hasfiyat'a gitmesi hedefe uzaklığa bağlı
   (`firebase/functions/src/index.ts`, `intervalFor`): bekleyen alarm yoksa ve piyasa kapalıyken
   hiç gitmez, hedef %4'ten uzaksa 15 dakikada bir gider. Kullanıcı sayısı değil, en yakın hedef
   önemlidir.

## 3. Yapılan değişiklikler

| Değişiklik | Dosya | Etki |
| --- | --- | --- |
| Fiyat yanıtı CDN'de paylaşılır (`CDN-Cache-Control: max-age=20, stale-while-revalidate=40, stale-if-error=3600`) | `app/api/prices+api.ts`, `src/core/constants/hasfiyatCache.ts` | Hasfiyat'a giden istek istemci ve işçi sayısına değil süreye bağlı. Süre dolunca eski yanıt verilirken arka planda yenilenir |
| Piyasa kapalıyken (cumartesi, pazar 22:00'a kadar) fiyat TTL'i 5 dk, istemci yoklaması 5 dk | `src/utils/marketHours.ts`, `MarketProvider.tsx` | Hafta sonu istekleri yaklaşık 15 kat azalır |
| İstemci yoklaması 10 sn yerine 20 sn (sunucu TTL'iyle aynı) | `src/core/constants/app.ts` | Daha sık sormak CDN'de aynı yanıtı getirirdi, yalnızca gereksiz trafik üretirdi |
| Geçmiş serileri CDN'de: saatlik 30 dk, günlük 6 sa | `app/api/history+api.ts` | Saatlik çubuk saatte bir kapanır; son nokta canlı fiyatla zaten güncellenir |
| İstemcide seri önbelleği ve aynı anda gelen aynı serinin tekilleştirilmesi | `src/data/datasources/hasfiyatHistoryDatasource.ts` | USD/TL gibi paylaşılan seriler platin, paladyum ve rasyo grafiğinde tek kez indirilir |
| Grafik yenileme 5 dk yerine 30 dk | `src/core/constants/app.ts` (`CHART_REFRESH_MS`) | Grafik istekleri yarıya iner; son nokta canlı fiyatla güncel kalır |
| Altın çeşidi geçmiş önbelleği 1 dk yerine 5 dk | `goldRateHistoryRepository.ts` | Periyot arasında gidip gelirken tekrar istek atılmaz |
| Periyot başına tek `from` (saatlik 30 gün, günlük 366 gün); kısa pencereler istemcide kırpılır | `hasfiyatHistoryDatasource.ts` | 1D/1W/1M ve 3M/1Y aynı CDN anahtarını paylaşır: bütün periyotları gezmek seri başına 5 yerine 2 istek |
| Önbellek süresi dolduğunda eşzamanlı istekler tek Hasfiyat çağrısını paylaşır | `hasfiyatPrices.ts`, `history+api.ts` | Aynı anda gelen N istek N yerine 1 upstream isteği olur |
| Hata önbelleği (10 sn) | `src/server/hasfiyatPrices.ts` | Kesintide yoklamalar Hasfiyat'a gitmez; CDN `stale-if-error` ile son iyi yanıt verilir |
| Gizli ve hatalı yanıtlar `no-store` | `alarm-values`, hata yanıtları | Gizli uç ya da hata yanıtı yanlışlıkla CDN'de saklanmaz |
| Her gerçek Hasfiyat isteği günlüğe yazılır (`[hasfiyat] upstream prices` / `history`) | `hasfiyatPrices.ts`, `history+api.ts` | Kullanım ölçülebilir |

Süreler tek yerden ayarlanır: `src/core/constants/hasfiyatCache.ts` ve `src/core/constants/app.ts`.

### Kullanıcı deneyimine etkisi

- Fiyatlar en fazla yaklaşık 20 sn (en kötü durumda süre + yoklama: ~40 sn) eski olabilir. Önceki
  durumda bu ~10-20 sn idi. Bir birikim takip uygulaması (alım-satım terminali değil) için kabul edilebilir bulundu.
- Hafta sonu ekran donuk fiyat gösterir; zaten yeni veri yok.
- Grafiklerde son nokta canlı fiyatla güncellenmeye devam eder, yalnızca geçmiş çubukları daha seyrek yenilenir.
- İlk açılışta gecikme olmaz: CDN yanıtı hazırdır (soğuk durumda tek istek).

## 4. Beklenen etki (hesap, ölçüm değil)

`L` = istekte bulunan CDN konumu sayısı, "aktif dakika" = o konumdan en az bir istemcinin
yoklama yaptığı dakika.

| Senaryo | Fiyat istekleri / aktif dakika |
| --- | --- |
| Eski, bir işçi, bir istemci | 6 |
| Eski, `k` işçi | 6 × `k` (kullanıcı arttıkça `k` büyür) |
| Yeni, piyasa açık | `L` × 3 (20 sn TTL) |
| Yeni, piyasa kapalı | `L` × 0,2 (5 dk TTL) |

Yani küçük kullanıcı sayısında kazanç ~%50 (6 → 3 /dk), kullanıcı arttıkça çok daha büyüktür
(istek istemci sayısıyla artmaz, konum sayısıyla sınırlanır). Hafta sonu ~15 kat azalır.

Geçmiş istekleri için üst sınır, anahtar sayısı ÷ TTL × `L`: 12 temel anahtar (6 seri × 2 periyot) × (60 / 30 dk)
= saatte en çok 24 istek / konum (eskiden 30 anahtar × 6 = 180). Gerçekte yalnızca ziyaret edilen periyotlar çekilir.

## 5. Ölçüm ve doğrulama (yayından sonra)

1. **CDN önbelleği çalışıyor mu?** İki ardışık istekte ikincisinin `cache-status` başlığı
   `hit` olmalı:
   ```bash
   curl -sI https://altin-kasam.expo.app/api/prices | grep -i cache
   curl -sI https://altin-kasam.expo.app/api/prices | grep -i cache
   ```
   Hâlâ `miss` görürseniz Expo Hosting yanıtı önbelleğe almıyordur; bu durumda en büyük kazanç
   devreye girmemiştir ve aşağıdaki "Aşama 2"ye geçilmelidir.
2. **Gerçek Hasfiyat isteği sayısı:** Expo Hosting günlüklerinde `[hasfiyat] upstream` satırlarını
   sayın (dashboard > Hosting > Logs). Hasfiyat panelindeki sayaçla karşılaştırın.
3. **Kota izleme:** Hasfiyat panelinde aylık kullanımı yayından sonraki ilk hafta günlük kontrol edin.

## 6. Kalan riskler ve Aşama 2 (uygulanmadı)

- **CDN davranışı doğrulanmadı.** Expo dokümanı `CDN-Cache-Control` desteğini söylüyor; konum
  başına mı küresel mi önbellek tuttuğu belirtilmemiş. Konum başına ise `L` büyüdükçe istek artar.
- **Küçük ölçekte hâlâ kullanıcıyla orantılı.** Tek konumdan bir kullanıcı bile aktif dakika başına
  3 istek üretir. Sürekli 7/24 açık tek bir cihaz ayda yüz binlerce istek harcayabilir (3 × 60 × 24 × 30).
- **Merkezi toplayıcı (önerilen sonraki adım).** Mevcut Firebase `checkAlarms` altyapısı kullanılarak
  fiyatları piyasa saatlerinde sabit aralıkla (ör. dakikada 1-3) çeken tek bir görev yazılır ve
  son görüntü bir dosyaya (Firestore ya da Hosting) yazılır; istemciler ve alarm kontrolü yalnızca
  bu dosyayı okur. Hasfiyat'a giden istek **kullanıcı sayısından ve konumdan tamamen bağımsız**,
  `piyasa dakikası × sıklık` olur. Maliyeti: Firebase kullanımı ve fiyatların dakikalık güncellenmesi.
- **WebSocket ya da webhook.** Hasfiyat'ın WebSocket'i kotaya girmiyorsa sürekli çalışan küçük bir
  sunucu aynı görüntüyü saniyelik üretebilir. Hasfiyat sözleşmesi doğrulanmadan uygulanmamalı.
- **TTL ayarı.** Kota hâlâ yetmiyorsa en ucuz kaldıraç `PRICES_TTL_OPEN_S` ve `POLL_INTERVAL_MS`
  değerlerini birlikte 30-60 sn yapmaktır (fiyat gecikmesi artar, yalnızca bu iki sabit değişir).
