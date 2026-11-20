# 02 — Ekranlar (Expo Router, `app/`)

Tüm `Stack.Screen` seçenekleri (başlık, modal/card sunumu) **`app/_layout.tsx`** içinde tanımlı. Geniş web'de
`goal`, `alarm`, `add-holding/index` ortalanmış pencere (`WebModalFrame`) olarak açılır (`WEB_MODALS`).
Yeni ekran eklerken: dosyayı `app/` altına koy + `_layout.tsx`'e `Stack.Screen` ekle + gerekiyorsa
`app.json` → `android.intentFilters` (deep link) ve `firebase/landing/.well-known/apple-app-site-association`.

## Sekmeler — `app/(tabs)/`

`_layout.tsx`: 4 sekme. Onboarding bitmediyse `/onboarding`'e yönlendirir (`useGoal().onboardingDone`).
Header sağı `HeaderActions` (ayarlar, destek vb.). Geniş web'de tab bar gizli, yerine `WebSidebar`.

| Dosya | Sekme | İçerik | Ana bağımlılık |
|---|---|---|---|
| `index.tsx` | **Piyasa** (açılış) | Altın/gümüş/platin/paladyum, altın çeşitleri, döviz; genişleyen fiyat satırları, metal grafiği, Brent, ticker | `useMarketViewModel`, `useMarketChart`, `ExpandablePriceRow`, `PriceChart`, `MarketTicker` |
| `analytics.tsx` | **Analiz** | Altın/Gümüş rasyosu, haftalık analiz kartları, ekonomik takvim özeti | `useGoldSilverRatioChart`, `useWeeklyAnalyses`, `useEconomicCalendar` |
| `community.tsx` | **Topluluk** | Bugünkü altın/gümüş haber+gönderi akışı, filtre sheet, topluluk beklentisi kartı | `useCommunityViewModel`, `useMarketInsights`, `FilterSheet`, `PostCard`, `InsightCard` |
| `portfolio.tsx` | **Kasam** | Hedef şeridi, toplam varlık grafiği, kâr/zarar özeti, pozisyonlar, dağılım | `usePortfolioViewModel`, `usePortfolioChart`, `useGoalProgress`, `GoalCard`, `HoldingListItem` |

## Diğer rotalar

| Rota / dosya | Ne | Nereden açılır |
|---|---|---|
| `onboarding.tsx` | İlk açılış sayfaları (hareketli demolar) + hedef sorusu | Tabs layout redirect |
| `goal.tsx` | Aylık/yıllık gram hedefi düzenle/sil (`GoalForm`) | Kasam hedef kartı |
| `add-holding/index.tsx` | Varlık ekleme (altın grupları, metal, nakit; miktar, fiyat), kayıtta `VaultDropAnimation` | `AddHoldingFab`, satır "Ekle", `?assetId=` |
| `position/[assetId].tsx` | Bir birimin tüm alımları, ortalama maliyet, alım silme | Kasam pozisyon satırı |
| `holding/[id].tsx` | Tek alım detayı | Şu an kodda hiçbir yerden `push` edilmiyor (eski rota; yerini `position/[assetId]` aldı) |
| `share-vault.tsx` | Kasayı görsel olarak paylaşma (`PortfolioShareCard`, view-shot) | Kasam |
| `alarm.tsx` | Fiyat alarmı kur/düzenle/sil (hedef fiyat ya da %), `?assetId=` (kasa toplamı ve rasyo dahil) | Piyasa satırı, metal/gold detay, Kasam, Analiz rasyo |
| `metal/[symbol].tsx` | Metal detay: büyük grafik, `PriceStatsTable`, Ekle/Alarm | Piyasa metal grafiği |
| `gold/[id].tsx` | Altın çeşidi detayı (grafik, ekle, alarm) | Piyasa altın satırı |
| `analysis/[id].tsx` | Haftalık analiz tam metni (beklenti, seviyeler, bölümler) | Analiz sekmesi |
| `calendar.tsx` | Tüm ekonomik takvim (Pro: yaklaşanlar + hatırlatma) | Analiz sekmesi |
| `economic-event/[id].tsx` | Açıklanan olay raporu (sonuç, beklenti, altın/gümüş etkisi, Fed tonu) | Takvim/Analiz satırı |
| `insight.tsx` | Topluluk beklentisi detayı, `?topic=gold|silver` (Pro) | Topluluk kartı |
| `post/[id].tsx` | Haber/gönderi detayı (`og:description` önizleme) | Topluluk akışı |
| `reader.tsx` | Uygulama içi tarayıcı (`?url=&title=`) | post, economic-event |
| `sources.tsx` | Haber kaynaklarını takip et (bildirim) | Topluluk, Ayarlar |
| `data-sources.tsx` | Tüm veri kaynakları + FRED bildirimi | Ayarlar |
| `settings.tsx` | Görünüm, yazı boyutu, Pro, widget, hesap, bildirim tercihleri, destek, yasal | `HeaderActions` |
| `support.tsx` | Destek/geri bildirim formu (Firebase `support` fonksiyonu) | Header destek butonu, Ayarlar |
| `paywall.tsx` | Pro satın alma ekranı (`?reason=` → `PAYWALL_REASON_TEXT`), demo paketler | `useProGate`, kilitli öğeler |
| `premium-benefits.tsx` | Pro'nun açtıkları + kullanıcının kullanım durumu | Ayarlar (Pro iken) |
| `manage-subscription.tsx` | Abonelik yönetimi | Ayarlar, premium-benefits |
| `widget.tsx` | Ana ekran widget'ı birim seçimi + önizleme | Piyasa, Ayarlar |
| `+html.tsx` | Web HTML iskeleti (tema anahtarı, arka plan) | web |
| `+not-found.tsx` | 404 | — |

## API rotaları — `app/api/*+api.ts`
Ekran değil, sunucu uçları → bkz. [05_ALTYAPI.md](05_ALTYAPI.md).
