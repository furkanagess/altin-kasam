import { CommunityProvider } from '@/src/viewmodels/community/CommunityProvider';
import { MarketProvider } from '@/src/viewmodels/market/MarketProvider';
import { PortfolioProvider } from '@/src/viewmodels/portfolio/PortfolioProvider';
import React from 'react';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MarketProvider>
      <PortfolioProvider>
        <CommunityProvider>{children}</CommunityProvider>
      </PortfolioProvider>
    </MarketProvider>
  );
}
