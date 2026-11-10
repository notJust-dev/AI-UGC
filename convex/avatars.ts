import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { urlOf, urlsOf, validateImageUploads } from "./lib/storage";

async function present(ctx: QueryCtx, a: Doc<"avatars">) {
  return {
    _id: a._id,
    name: a.name,
    description: a.description ?? null,
    isPublic: a.ownerId === undefined,
    coverUrl: await urlOf(ctx, a.coverImageId),
  };
}

export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("avatars")
      .withIndex("by_owner", (q) => q.eq("ownerId", undefined))
      .take(50);
    return Promise.all(rows.map((a) => present(ctx, a)));
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("avatars")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(100);
    return Promise.all(rows.map((a) => present(ctx, a)));
  },
});

export const get = query({
  args: { id: v.id("avatars") },
  handler: async (ctx, { id }) => {
    const userId = await optionalUserId(ctx);
    const a = await ctx.db.get(id);
    if (!a || (a.ownerId !== undefined && a.ownerId !== userId)) return null;
    return { ...(await present(ctx, a)), imageUrls: await urlsOf(ctx, a.imageIds) };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    imageIds: v.array(v.id("_storage")),
    consent: v.boolean(),
  },
  handler: async (ctx, { name, imageIds, consent }) => {
    const ownerId = await requireUserId(ctx);
    if (!consent) {
      throw new ConvexError("Confirm you have the right to use this person's likeness");
    }
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 60) throw new ConvexError("Give the avatar a name");
    await validateImageUploads(ctx, imageIds);
    return await ctx.db.insert("avatars", {
      ownerId,
      name: trimmed,
      imageIds,
      coverImageId: imageIds[0],
    });
  },
});

export const remove = mutation({
  args: { id: v.id("avatars") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const a = await ctx.db.get(id);
    if (!a || a.ownerId !== userId) throw new ConvexError("Avatar not found");
    await ctx.db.delete(id);
    for (const imageId of a.imageIds) await ctx.storage.delete(imageId);
  },
});

/** Seeding only: insert a public catalog avatar. */
export const insertPublic = internalMutation({
  args: {
    name: v.string(),
    description: v.string(),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, { name, description, imageId }) => {
    return await ctx.db.insert("avatars", {
      name,
      description,
      imageIds: [imageId],
      coverImageId: imageId,
    });
  },
});
