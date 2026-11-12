import { DEFAULT_HOME_WIDGET_OPTION_ID, HOME_WIDGET_UPDATE_INTERVAL_MS } from '@/src/core/constants/homeWidget';
import { homeWidgetRepository } from '@/src/data/repositories/homeWidgetRepository';
import type { HomeWidgetProps } from '@/src/domain/models';
import { useMarketViewModel } from '@/src/viewmodels/market/MarketProvider';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

type HomeWidgetViewModel = {
  /** Development build'de `true`; Expo Go ve web'de widget yoktur. */
  available: boolean;
  selectedId: string;
  select: (id: string) => void;
  /** Pro içerik (fiyatlı); ücretsiz kullanıcıya önizlemede bulanık gösterilir. */
  preview: HomeWidgetProps | null;
  locked: boolean;
};

const HomeWidgetContext = createContext<HomeWidgetViewModel | null>(null);

export function HomeWidgetProvider({ children }: { children: React.ReactNode }) {
  const { isPremium } = useSubscription();
  const { displayQuotes, displayGoldRates, currency } = useMarketViewModel();
  const [selectedId, setSelectedId] = useState(DEFAULT_HOME_WIDGET_OPTION_ID);
  const [available] = useState(() => homeWidgetRepository.isAvailable());

  useEffect(() => {
    let cancelled = false;
    homeWidgetRepository.getSelectedOptionId().then((id) => {
      if (!cancelled) setSelectedId(id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const preview = useMemo(
    () =>
      homeWidgetRepository.buildProps(
        selectedId,
        { quotes: displayQuotes, goldRates: displayGoldRates, currency },
        true,
      ),
    [selectedId, displayQuotes, displayGoldRates, currency],
  );
  const sent = useMemo(
    () =>
      isPremium
        ? preview
        : homeWidgetRepository.buildProps(selectedId, { quotes: [], goldRates: [], currency }, false),
    [isPremium, preview, selectedId, currency],
  );

  const latest = useRef(sent);
  useEffect(() => {
    latest.current = sent;
  }, [sent]);

  // Seçim, Pro ya da para birimi değişince hemen; saniyelik fiyat tikleri en fazla dakikada bir gider.
  const push = useCallback(() => {
    if (available && latest.current) homeWidgetRepository.push(latest.current);
  }, [available]);
  const ready = sent !== null;
  useEffect(() => {
    if (ready) push();
  }, [push, ready, selectedId, isPremium, currency]);
  useEffect(() => {
    if (!available) return;
    const timer = setInterval(push, HOME_WIDGET_UPDATE_INTERVAL_MS);
    // Arka plana geçerken son fiyat bırakılır; uygulama kapalıyken widget bu değeri gösterir.
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') push();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [available, push]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    void homeWidgetRepository.setSelectedOptionId(id);
  }, []);

  const value = useMemo(
    () => ({ available, selectedId, select, preview, locked: !isPremium }),
    [available, selectedId, select, preview, isPremium],
  );
  return <HomeWidgetContext.Provider value={value}>{children}</HomeWidgetContext.Provider>;
}

export function useHomeWidget(): HomeWidgetViewModel {
  const ctx = useContext(HomeWidgetContext);
  if (!ctx) throw new Error('useHomeWidget, HomeWidgetProvider içinde kullanılmalı');
  return ctx;
}
