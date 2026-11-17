# Haftalık analiz: Firebase'den elle giriş

Uygulama haftalık analizleri Firestore `weeklyAnalyses` koleksiyonundan okur (`weeklyAnalyses` Cloud Function'ı üzerinden). Yeni hafta için uygulama güncellemesi gerekmez; en fazla 5 dk içinde görünür.

## Şablon

1. **Tek cümlede özet** (`summary`)
2. **Haftalık beklenti ve takip seviyeleri** (`outlook`, `levels`)
3. **Geri kalan bölümler**: başlık + yorum (`sections`)

## Yeni hafta ekleme (Firebase Console → Firestore → `weeklyAnalyses` → Doküman ekle)

Belge kimliği: `2026-w47` (yıl-hafta; sıralama `weekStart`'a göre yapılır).

| Alan | Tür | Örnek |
|---|---|---|
| `weekStart` | string | `2026-11-16` (pazartesi) |
| `publishedAt` | string | `2026-11-16T07:00:00.000Z` (boşsa `weekStart` kullanılır) |
| `published` | boolean | `true` (false/yok ise uygulamada görünmez; taslak için) |
| `summary` | string | tek cümle |
| `outlook` | array of map | `{ metal: "gold" \| "silver", direction: "up" \| "down" \| "neutral", note: "…" }` |
| `levels` | array of map | `{ label: "Ons altın", support: "3.950 $", resistance: "4.100 $" }` ya da tek değer için `{ label, value }` |
| `sections` | array of map | `{ title: "Dolar ve faiz", comment: "…" }` |

Örnek içerik: `firebase/public/weekly-analyses.json`.

## Kurulum (bir kez)

```bash
cd firebase && firebase deploy --only functions:weeklyAnalyses
```

Ardından `.env.local` içine fonksiyon adresini yaz ve uygulamayı yeniden başlat:

```
EXPO_PUBLIC_WEEKLY_ANALYSIS_URL=https://us-central1-altin-kasam-628d2.cloudfunctions.net/weeklyAnalyses
```

Tanımlı değilse uygulama repodaki `weekly-analyses.json` dosyasına (`/api/weekly`) düşer.
Firestore kuralları değişmez: istemci doğrudan okumaz, yalnızca fonksiyon okur.
