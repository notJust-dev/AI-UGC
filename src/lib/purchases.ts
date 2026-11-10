import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

// Purchases are mobile-only in v1. The web build uses purchases.web.ts.
export const purchasesSupported = true;

export const OFFERING_CREDITS = 'credits';
export const OFFERING_SUBSCRIPTIONS = 'default';

let configuredFor: string | null = null;

function apiKey(): string | undefined {
  // Test Store key in development builds only; store keys in release builds.
  if (__DEV__ && process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY) {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY;
  }
  return Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
}

/** Configures RevenueCat for the signed-in Clerk user. Never anonymous. */
export async function configurePurchases(userId: string): Promise<boolean> {
  const key = apiKey();
  if (!key) {
    console.warn('RevenueCat key missing; purchases disabled');
    return false;
  }
  if (configuredFor === userId) return true;
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.WARN);
  if (configuredFor === null && !(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey: key, appUserID: userId });
  } else {
    await Purchases.logIn(userId);
  }
  configuredFor = userId;
  return true;
}

export async function resetPurchases() {
  if (configuredFor === null) return;
  configuredFor = null;
  await Purchases.logOut().catch(() => undefined);
}

export type PaywallOutcome = 'purchased' | 'cancelled' | 'error' | 'unavailable';

async function present(offeringId: string): Promise<PaywallOutcome> {
  if (configuredFor === null) return 'unavailable';
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[offeringId] ?? offerings.current ?? undefined;
    const result = await RevenueCatUI.presentPaywall({ offering, displayCloseButton: true });
    if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
      await Purchases.invalidateVirtualCurrenciesCache().catch(() => undefined);
      return 'purchased';
    }
    return result === PAYWALL_RESULT.ERROR ? 'error' : 'cancelled';
  } catch (e) {
    console.warn('paywall failed', e);
    return 'error';
  }
}

export const presentCreditsPaywall = () => present(OFFERING_CREDITS);
export const presentSubscriptionPaywall = () => present(OFFERING_SUBSCRIPTIONS);

export async function restorePurchases(): Promise<boolean> {
  if (configuredFor === null) return false;
  await Purchases.restorePurchases();
  await Purchases.invalidateVirtualCurrenciesCache().catch(() => undefined);
  return true;
}
