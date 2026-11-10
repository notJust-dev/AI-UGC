import { ConvexError } from 'convex/values';

export const INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS';

export type InsufficientCredits = { code: typeof INSUFFICIENT_CREDITS; needed: number; balance: number };

export function insufficientCredits(e: unknown): InsufficientCredits | null {
  if (e instanceof ConvexError && typeof e.data === 'object' && e.data?.code === INSUFFICIENT_CREDITS) {
    return e.data as InsufficientCredits;
  }
  return null;
}

/** User-facing message for any thrown value (ConvexError data, rate limits, network). */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof ConvexError) {
    if (typeof e.data === 'string') return e.data;
    if (e.data?.kind === 'RateLimited') return "You're going a bit fast. Try again in a minute.";
    if (e.data?.code === INSUFFICIENT_CREDITS) return 'Not enough credits.';
    if (typeof e.data?.message === 'string') return e.data.message;
  }
  if (e instanceof Error && /network|fetch/i.test(e.message)) {
    return 'Network problem. Check your connection and try again.';
  }
  return fallback;
}
