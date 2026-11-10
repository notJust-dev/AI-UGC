import { useAction } from 'convex/react';
import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';

import { api } from '@convex/_generated/api';
import {
  presentCreditsPaywall,
  presentSubscriptionPaywall,
  purchasesSupported,
  type PaywallOutcome,
} from '@/lib/purchases';

function webNotice() {
  const msg = 'Credits can be purchased in the AIUGC app for iPhone and Android. Your balance syncs everywhere.';
  if (Platform.OS === 'web') window.alert(msg);
  else Alert.alert('Get credits', msg);
}

/** Opens a paywall, then refreshes the server-side balance mirror. */
export function usePaywall() {
  const sync = useAction(api.credits.sync);

  const afterPurchase = useCallback(
    async (outcome: PaywallOutcome) => {
      if (outcome !== 'purchased') return outcome;
      // The grant can lag the purchase slightly; retry a few times.
      for (const delay of [0, 1500, 4000]) {
        await new Promise((r) => setTimeout(r, delay));
        await sync().catch(() => undefined);
      }
      return outcome;
    },
    [sync],
  );

  const credits = useCallback(async () => {
    if (!purchasesSupported) return webNotice();
    const outcome = await presentCreditsPaywall();
    if (outcome === 'unavailable') Alert.alert('Purchases unavailable', 'Please try again later.');
    return afterPurchase(outcome);
  }, [afterPurchase]);

  const subscribe = useCallback(async () => {
    if (!purchasesSupported) return webNotice();
    const outcome = await presentSubscriptionPaywall();
    if (outcome === 'unavailable') Alert.alert('Purchases unavailable', 'Please try again later.');
    return afterPurchase(outcome);
  }, [afterPurchase]);

  return { credits, subscribe };
}

export function useBuyCredits() {
  return usePaywall().credits;
}
