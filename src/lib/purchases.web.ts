// Web build: purchases are mobile-only in v1. Same surface as purchases.ts, no SDK.
export const purchasesSupported = false;

export const OFFERING_CREDITS = 'credits';
export const OFFERING_SUBSCRIPTIONS = 'default';

export type PaywallOutcome = 'purchased' | 'cancelled' | 'error' | 'unavailable';

export async function configurePurchases(_userId: string): Promise<boolean> {
  return false;
}

export async function resetPurchases() {}

export async function presentCreditsPaywall(): Promise<PaywallOutcome> {
  return 'unavailable';
}

export async function presentSubscriptionPaywall(): Promise<PaywallOutcome> {
  return 'unavailable';
}

export async function restorePurchases(): Promise<boolean> {
  return false;
}
