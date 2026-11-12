import { AlarmProvider } from '@/src/viewmodels/alarm/AlarmProvider';
import { EconomicCalendarProvider } from '@/src/viewmodels/analysis/EconomicCalendarProvider';
import { CommunityProvider } from '@/src/viewmodels/community/CommunityProvider';
import { GoalProvider } from '@/src/viewmodels/goal/GoalProvider';
import { MarketProvider } from '@/src/viewmodels/market/MarketProvider';
import { PortfolioProvider } from '@/src/viewmodels/portfolio/PortfolioProvider';
import { SnackbarProvider } from '@/src/viewmodels/snackbar/SnackbarProvider';
import { SubscriptionProvider } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { HomeWidgetProvider } from '@/src/viewmodels/widget/HomeWidgetProvider';
import { AnalyticsTracker } from '@/src/providers/AnalyticsTracker';
import React from 'react';

/** Piyasa görünümü (para birimi, periyot) Pro durumuna bağlı olduğu için abonelik en dışta. */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider>
    <AnalyticsTracker />
    <SubscriptionProvider>
      <GoalProvider>
        <MarketProvider>
          <HomeWidgetProvider>
            {/* Alarm, kasa toplam değerini de izlediği için kasanın içinde. */}
            <PortfolioProvider>
              <AlarmProvider>
                <CommunityProvider>
                  <EconomicCalendarProvider>{children}</EconomicCalendarProvider>
                </CommunityProvider>
              </AlarmProvider>
            </PortfolioProvider>
          </HomeWidgetProvider>
        </MarketProvider>
      </GoalProvider>
    </SubscriptionProvider>
    </SnackbarProvider>
  );
}
