# Altın Kasam

Canlı emtia fiyatları, sanal altın portföyü ve hashtag odaklı topluluk feed’i sunan React Native (Expo) uygulaması.

## Mimari

- **MVVM** — Screen (View) → Provider ViewModel → Repository / Datasource
- **Provider** state management (`Market`, `Portfolio`, `Community`)
- **Atomic widgets** — `atoms` / `molecules` / `organisms`
- Tema ayrımı: `src/core/theme` (`colors`, `paddings`, `spacing`, `typography`, `radii`)
- Domain sabitleri: `src/core/constants` (altın formları, hashtag’ler)

## Özellikler

1. **Piyasa** — Altın referansı, gümüş, bakır, platin, petrol; mock canlı fiyat + grafik
2. **Portföy** — 14/18/22/24 ayar, çeyrek/yarım/tam/reşat/gram ekleme; canlı valuation & P&L
3. **Topluluk** — `#Altın`, `#XAUUSD` vb. curated feed

> Fiyatlar varsayılan olarak **mock canlı akış**tır. Gerçek API aynı `IMarketDatasource` arkasından bağlanır.

## Çalıştırma

```bash
npm install
npm run web      # http://localhost:3847
npm start        # Expo Dev Tools
npm run typecheck
```

## Klasörler

```
app/                 # Expo Router ekranları (View)
src/
  core/              # theme, constants, storage
  domain/            # enums, models
  data/              # datasources, repositories
  viewmodels/        # Provider ViewModels
  widgets/           # atomic UI
  providers/         # AppProviders
docs/CALISMA_PLANI.md
```
