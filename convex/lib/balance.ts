import type { MutationCtx } from "../_generated/server";

/**
 * Writes the RevenueCat balance into the mirror. Only values RevenueCat
 * returned are ever written, and an older read never overwrites a newer one.
 */
export async function setBalanceIfNewer(
  ctx: MutationCtx,
  userId: string,
  balance: number,
  syncedAt: number,
) {
  const row = await ctx.db
    .query("creditBalances")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!row) {
    await ctx.db.insert("creditBalances", { userId, balance, syncedAt });
  } else if (syncedAt >= row.syncedAt) {
    await ctx.db.patch(row._id, { balance, syncedAt });
  }
}
