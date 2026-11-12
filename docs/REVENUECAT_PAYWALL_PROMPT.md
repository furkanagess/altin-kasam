# RevenueCat Paywall Promptu — Altın Kasam Pro

RevenueCat dashboard > Paywalls > AI ile oluştur alanına yapıştırılır.
Entitlement kimliği: `premium`. Offering: `default` (Aylık, Yıllık, Ömür boyu paketleri).

---

Design a subscription paywall for "Altın Kasam Pro", a Turkish-language mobile app for tracking gold and silver prices and a personal virtual "vault" (kasa) of gold, silver and cash holdings. The audience is everyday Turkish savers who buy gold coins, bracelets and gram gold, not day traders. The tone is calm, trustworthy and premium, like a private bank app, never hype or casino-like. All copy must be in Turkish.

## Visual style
- Warm, minimal, editorial. Flat surfaces with hairline borders, no heavy shadows, no gradients except one very subtle gold tint behind the header.
- Light theme: background #F3F0EA (warm paper), cards #FFFFFF with 1px border, primary text #14181F, secondary text #3A4250.
- Dark theme: background #121417, cards slightly lighter, primary text #F2EEE6, secondary #C5BCAE. Support both automatically.
- Single accent: gold #B8893B (light) / #D4A64F (dark), deep gold #8A6428 / #E2B866 for text on tint, soft gold tint #FFF8EC / #252016 for selected states.
- Corner radius 12 for cards and inputs, 16 for large panels, fully rounded for the CTA button.
- Use the system font, bold weights for titles and prices, regular for details. Generous spacing, 20px side padding, content scrolls but the CTA stays pinned at the bottom.
- Thin line icons (24px, 1.5px stroke) in gold, no filled or emoji icons.

## Structure (top to bottom)
1. Small gold "PRO" pill badge, then the title "Altın Kasam Pro" and the subtitle "Kasanı ve piyasayı daha derin takip et."
2. Feature list, each row a gold line icon + bold title + one-line gray detail:
   - Topluluk beklentisi: "Altın ve gümüş haberlerinin tonundan günlük yükseliş/düşüş yönü ve özet"
   - Ekonomik takvim ve karar raporları: "Yaklaşan Fed, TCMB ve enflasyon açıklamaları, hatırlatmalar; açıklanan kararların analizi"
   - Ana ekran widget'ı: "Seçtiğin altın çeşidinin veya gümüşün fiyatı telefonunun ana ekranında"
   - Uzun dönem grafikler: "1 ay, 3 ay ve 1 yıllık fiyat geçmişi"
   - Dolar ve euro görünümü: "Tüm fiyatlar, grafikler ve kasan USD/EUR"
   - Sınırsız kasa: "5 kalem sınırı kalkar"
   - Sınırsız fiyat alarmı: "1 alarm sınırı kalkar"
   Show only these seven real features. Do not invent features, testimonials, ratings, user counts or fake "limited time" urgency (store policy).
3. Package selector as a vertical radio group of cards: Aylık, Yıllık, Ömür boyu. Each card shows the period name, the localized price string and, when present, a green "7 gün ücretsiz" style trial line. Preselect Yıllık and give it a gold "%X tasarruf" badge computed against monthly. Selected card gets a 2px gold border and soft gold tint; unselected cards have a hairline border.
4. Primary full-width gold button (white-on-gold in light mode, dark-ink-on-gold in dark mode). Label is "Ücretsiz denemeyi başlat" when the selected package has a trial, otherwise "Pro'ya geç". Under it, one line in small gray: "İstediğin zaman iptal edebilirsin." only if the package is auto-renewing.
5. Secondary text buttons: "Satın alımları geri yükle" and a ghost "Şimdi değil" (close). The close must always be available, no dark patterns.
6. Footer in small tertiary text: auto-renewal and billing disclosure for the store, plus "Kullanım Koşulları" and "Gizlilik Politikası" links in gold.

## Behavior and details
- Prices, trial and billing text must come from the store and be localized (TRY). Never hardcode amounts.
- Adapt the subtitle to the entry point when a reason is passed: "1 ay, 3 ay ve 1 yıllık grafikler Pro'ya dahildir." / "Fiyatları dolar ve euro ile görmek Pro'ya dahildir." / "Ücretsiz planda kasana en fazla 5 kalem ekleyebilirsin." / "Ücretsiz planda 1 fiyat alarmı kurabilirsin; Pro ile sınır kalkar."
- Show a loading state on the CTA during purchase and an inline red error line above the button on failure, not a modal.
- If the user is already subscribed, replace the content with "Pro aktif / Tüm Pro özellikler açık. Teşekkürler!" and an "Aboneliği yönet" button.
- Accessibility: minimum 48px touch targets, text contrast of at least 4.5:1 in both themes, packages exposed as a radio group, support Dynamic Type without clipping.
- Keep it to a single screen on a modern phone; the feature list may scroll underneath a pinned package selector and CTA.
