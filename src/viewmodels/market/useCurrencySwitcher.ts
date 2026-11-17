import { useMarketChart, useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
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

/**
 * Piyasa grafiğinin para birimi seçicisi. Gramda genel para birimini, onsta ons grafiğine özel
 * seçimi (varsayılan USD) değiştirir; portföy gibi diğer ekranlar etkilenmez.
 */
export function useChartCurrencySwitcher() {
  const { currencies, fxRates } = useMarketViewModel();
  const { chartCurrency, lockedChartCurrencies, setChartCurrency } = useMarketChart();
  const { openPaywall } = useSubscription();
  const onLocked = useCallback(() => openPaywall('currency'), [openPaywall]);
  return useMemo(
    () => ({
      value: chartCurrency,
      options: currencies,
      onChange: setChartCurrency,
      fxRates,
      lockedOptions: lockedChartCurrencies,
      onLocked,
    }),
    [chartCurrency, currencies, setChartCurrency, fxRates, lockedChartCurrencies, onLocked],
  );
}

/** Brent petrol grafiğinin para birimi seçicisi: ons gibi USD ana birimdir, gram/ons geçişinden bağımsızdır. */
export function useBrentCurrencySwitcher() {
  const { currencies, fxRates } = useMarketViewModel();
  const { brentCurrency, lockedBrentCurrencies, setBrentCurrency } = useMarketChart();
  const { openPaywall } = useSubscription();
  const onLocked = useCallback(() => openPaywall('currency'), [openPaywall]);
  return useMemo(
    () => ({
      value: brentCurrency,
      options: currencies,
      onChange: setBrentCurrency,
      fxRates,
      lockedOptions: lockedBrentCurrencies,
      onLocked,
    }),
    [brentCurrency, currencies, setBrentCurrency, fxRates, lockedBrentCurrencies, onLocked],
  );
}
