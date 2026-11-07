# Altın Kasam

Canlı emtia fiyatları, sanal altın portföyü ve hashtag odaklı topluluk feed’i sunan React Native (Expo) mobil uygulama.

## Durum

Şu an **çalışma planı** tamamlandı. Uygulama iskeleti henüz kurulmadı.

Detaylı plan: [`docs/CALISMA_PLANI.md`](./docs/CALISMA_PLANI.md)

## Hedef mimari

- **MVVM** — View / ViewModel (Provider) / Model (Repository)
- **Provider** state management (Context)
- **Atomic Design** widget sistemi (`atoms` → `molecules` → `organisms`)
- Tema ayrımı: `colors`, `paddings`, `spacing`, `typography`, `constants`

## Ürün yüzeyleri

1. **Piyasa** — Altın (ayar + form), gümüş, bakır, petrol, platin; canlı fiyat ve grafik
2. **Portföy** — Sanal kasa; canlı valuation ve P&L
3. **Topluluk** — `#Altın`, `#XAUUSD` vb. içerik feed’i

## Sonraki adım

Faz 0: Expo + TypeScript scaffold, klasör sözleşmesi, tema tokenları, tab navigasyon, Provider şablonu.
