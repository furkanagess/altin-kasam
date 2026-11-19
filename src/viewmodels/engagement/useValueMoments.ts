import { analyticsDatasource } from '@/src/data/datasources/analyticsDatasource';
import type { PaywallReason } from '@/src/core/constants/premium';
import { decideAtMoment, type ValueMoment } from '@/src/data/datasources/promptsDatasource';
import { reviewDatasource } from '@/src/data/datasources/reviewDatasource';
import { useSubscription } from '@/src/viewmodels/subscription/SubscriptionProvider';
import { useCallback } from 'react';

/** Paywall'un ilk satırı, kullanıcının o an yaşadığı değere göre seçilir. */
const MOMENT_REASON: Record<ValueMoment, PaywallReason> = {
  holding_added: 'value',
  alarm_created: 'value',
  alarm_triggered: 'alarmTriggered',
};

/**
 * Kullanıcının değer gördüğü anlarda çağrılır; paywall ya da puan isteğinin zamanı geldiyse onu açar.
 * `delayMs`: ekranın kapanması, snackbar ya da animasyonun bitmesi için bekleme.
 */
export function useValueMoments() {
  const { isPremium, openPaywall } = useSubscription();

  const reach = useCallback(
    async (moment: ValueMoment, delayMs = 0) => {
      const decision = await decideAtMoment(moment, isPremium);
      if (!decision) return;
      analyticsDatasource.track({ name: 'prompt_shown', kind: decision, moment });
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (decision === 'paywall') openPaywall(MOMENT_REASON[moment]);
      else void reviewDatasource.askWithCheck();
    },
    [isPremium, openPaywall],
  );

  return { reach };
}
