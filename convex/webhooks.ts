import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const JWKS_TTL_MS = 12 * 60 * 60 * 1000;

export const getFalJwks = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("falJwks").first();
    if (!row || Date.now() - row.fetchedAt > JWKS_TTL_MS) return null;
    return row.keys;
  },
});

export const saveFalJwks = internalMutation({
  args: { keys: v.array(v.string()) },
  handler: async (ctx, { keys }) => {
    const row = await ctx.db.query("falJwks").first();
    if (row) await ctx.db.patch(row._id, { keys, fetchedAt: Date.now() });
    else await ctx.db.insert("falJwks", { keys, fetchedAt: Date.now() });
  },
});
