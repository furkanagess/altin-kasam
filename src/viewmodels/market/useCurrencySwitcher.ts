import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useCallback, useMemo } from 'react';

/**
 * `CurrencySwitcher` memo'lu olduğu için prop referansları sabit tutulur;
 * aksi halde saniyelik fiyat tikleri seçiciyi de yeniden çizdirir.
 */
export function useCurrencySwitcher() {
  const { currency, currencies, setCurrency, fxRates, lockedCurrencies } = useMarketViewModel();
  const { openPaywall } = useSubscription();
  const onLocked = useCallback(() => openPaywall('currency'), [openPaywall]);
  return useMemo(
    () => ({
      value: currency,
      options: currencies,
      onChange: setCurrency,
      fxRates,
      lockedOptions: lockedCurrencies,
      onLocked,
    }),
    [currency, currencies, setCurrency, fxRates, lockedCurrencies, onLocked],
  );
}
