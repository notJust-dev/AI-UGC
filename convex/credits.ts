import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { setBalanceIfNewer } from "./lib/balance";
import { rateLimiter } from "./lib/rateLimits";

/** Reactive credit balance (mirror of RevenueCat). null = not synced yet. */
export const balance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    return row ? { balance: row.balance, syncedAt: row.syncedAt } : null;
  },
});

/** Called on app start and after the paywall closes. */
export const sync = action({
  args: {},
  handler: async (ctx): Promise<number | null> => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "creditSync", { key: userId, throws: true });
    if (!process.env.REVENUECAT_SECRET_KEY) return null;
    return await ctx.runAction(internal.billing.syncUser, { userId });
  },
});

export const setBalance = internalMutation({
  args: { userId: v.string(), balance: v.number(), syncedAt: v.number() },
  handler: async (ctx, { userId, balance, syncedAt }) => {
    await setBalanceIfNewer(ctx, userId, balance, syncedAt);
  },
});
