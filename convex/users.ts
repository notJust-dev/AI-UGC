import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation } from "./_generated/server";
import { requireUserId } from "./lib/auth";

const BATCH = 50;

/**
 * Deletes everything the signed-in user owns (videos, generations, avatars,
 * products, files, balance mirror). The app deletes the Clerk user right after.
 * Credits held in RevenueCat are not refundable through this.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.scheduler.runAfter(0, internal.users.purge, { userId });
  },
});

export const purge = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    let removed = 0;

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(BATCH);
    for (const vid of videos) {
      if (vid.posterId) await ctx.storage.delete(vid.posterId);
      if (vid.videoFileId) await ctx.storage.delete(vid.videoFileId);
      await ctx.db.delete(vid._id);
      removed++;
    }

    const gens = await ctx.db
      .query("generations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(BATCH);
    for (const gen of gens) {
      await ctx.db.delete(gen._id);
      removed++;
    }

    const avatars = await ctx.db
      .query("avatars")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .take(BATCH);
    for (const a of avatars) {
      for (const id of a.imageIds) await ctx.storage.delete(id);
      await ctx.db.delete(a._id);
      removed++;
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .take(BATCH);
    for (const p of products) {
      for (const id of p.imageIds) await ctx.storage.delete(id);
      await ctx.db.delete(p._id);
      removed++;
    }

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (balance) await ctx.db.delete(balance._id);

    // Keep going until nothing is left.
    if (removed > 0) await ctx.scheduler.runAfter(0, internal.users.purge, { userId });
  },
});
