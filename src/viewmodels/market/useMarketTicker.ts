import { MetalSymbol } from '@/src/domain/enums';
import type { MarketSnapshot, TickerItem } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useMemo } from 'react';

/** Kaynak şerit vermezse (Hasfiyat yok) aynı kalemler uygulamanın TL fiyatlarından kurulur. */
function fallbackTicker(snapshot: MarketSnapshot): TickerItem[] {
  const rate = (assetId: string) => snapshot.goldRates.find((r) => r.assetId === assetId);
  const quote = (symbol: MetalSymbol) => snapshot.quotes.find((q) => q.symbol === symbol);
  const items: (TickerItem | null)[] = [
    snapshot.fxRates.USD
      ? { id: 'usd', label: 'USD', value: snapshot.fxRates.USD, currency: 'TRY', changePercent: null }
      : null,
    snapshot.fxRates.EUR
      ? { id: 'eur', label: 'EUR', value: snapshot.fxRates.EUR, currency: 'TRY', changePercent: null }
      : null,
    ...(
      [
        ['gram', 'GRAM', quote(MetalSymbol.XAU)],
        ['22ayar', '22 AYAR', rate('gram-22')],
        ['14ayar', '14 AYAR', rate('gram-14')],
        ['ceyrek', 'ÇEYREK', rate('ceyrek-22')],
        ['gumus', 'GÜMÜŞ', quote(MetalSymbol.XAG)],
      ] as const
    ).map(([id, label, price]) =>
      price ? { id, label, value: price.bid, currency: 'TRY' as const, changePercent: price.changePercent } : null,
    ),
  ];
  return items.filter((i): i is TickerItem => i !== null);
}

/** Piyasa özet şeridinin kalemleri; fiyat yokken boş. */
export function useMarketTicker(): TickerItem[] {
  const { snapshot } = useMarketViewModel();
  return useMemo(() => {
    if (!snapshot) return [];
    return snapshot.ticker?.length ? snapshot.ticker : fallbackTicker(snapshot);
  }, [snapshot]);
}
