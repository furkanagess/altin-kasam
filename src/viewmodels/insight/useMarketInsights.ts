import { insightRepository } from '@/src/data/repositories/insightRepository';
import { MetalSymbol } from '@/src/domain/enums';
import type { MetalInsight } from '@/src/domain/models';
import { useCommunityViewModel } from '@/src/viewmodels/community/CommunityProvider';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useMemo } from 'react';

export type MarketInsights = {
  /** Akışlardan biri hâlâ ilk kez yükleniyor. */
  loading: boolean;
  gold: MetalInsight;
  silver: MetalInsight;
};

/**
 * Günün (filtresiz) altın ve gümüş akışlarından ton analizi. Fiyat yalnızca
 * günlük değişim yuvarlandığında değiştiği için saniyelik tikler analizi yeniden çalıştırmaz.
 */
export function useMarketInsights(): MarketInsights {
  const { topicFeeds } = useCommunityViewModel();
  const { quotes } = useMarketViewModel();

  const goldQuote = quotes.find((q) => q.symbol === MetalSymbol.XAU);
  const silverQuote = quotes.find((q) => q.symbol === MetalSymbol.XAG);
  // Analiz metni fiyatı iki ondalıkla yazar; daha sık yeniden hesaplamaya gerek yok.
  const goldPrice = goldQuote ? Math.round(goldQuote.bid) : undefined;
  const goldChange = goldQuote?.changePercent;
  const silverPrice = silverQuote ? Math.round(silverQuote.bid * 100) / 100 : undefined;
  const silverChange = silverQuote?.changePercent;

  return useMemo(() => {
    const market = (price?: number, changePercent?: number) =>
      price != null && changePercent != null ? { price, changePercent } : undefined;
    return {
      loading: topicFeeds.gold.state === 'loading' || topicFeeds.silver.state === 'loading',
      gold: insightRepository.analyze('gold', topicFeeds.gold.posts, market(goldPrice, goldChange)),
      silver: insightRepository.analyze('silver', topicFeeds.silver.posts, market(silverPrice, silverChange)),
    };
  }, [topicFeeds, goldPrice, goldChange, silverPrice, silverChange]);
}
