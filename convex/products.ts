import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { urlsOf, validateImageUploads } from "./lib/storage";

const MAX_DESCRIPTION = 600;

async function present(ctx: QueryCtx, p: Doc<"products">) {
  return {
    _id: p._id,
    name: p.name,
    description: p.description,
    imageUrls: await urlsOf(ctx, p.imageIds),
  };
}

function validate(name: string, description: string) {
  const n = name.trim();
  const d = description.trim();
  if (!n || n.length > 60) throw new ConvexError("Give the product a name");
  if (d.length > MAX_DESCRIPTION) {
    throw new ConvexError(`Keep the description under ${MAX_DESCRIPTION} characters`);
  }
  return { name: n, description: d };
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("products")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(100);
    return Promise.all(rows.map((p) => present(ctx, p)));
  },
});

export const get = query({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await optionalUserId(ctx);
    const p = await ctx.db.get(id);
    if (!p || p.ownerId !== userId) return null;
    return { ...(await present(ctx, p)), imageIds: p.imageIds };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireUserId(ctx);
    const { name, description } = validate(args.name, args.description);
    await validateImageUploads(ctx, args.imageIds);
    return await ctx.db.insert("products", {
      ownerId,
      name,
      description,
      imageIds: args.imageIds,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    name: v.string(),
    description: v.string(),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const p = await ctx.db.get(args.id);
    if (!p || p.ownerId !== userId) throw new ConvexError("Product not found");
    const { name, description } = validate(args.name, args.description);
    await validateImageUploads(ctx, args.imageIds);
    await ctx.db.patch(args.id, { name, description, imageIds: args.imageIds });
    for (const old of p.imageIds) {
      if (!args.imageIds.includes(old)) await ctx.storage.delete(old);
    }
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const p = await ctx.db.get(id);
    if (!p || p.ownerId !== userId) throw new ConvexError("Product not found");
    await ctx.db.delete(id);
    for (const imageId of p.imageIds) await ctx.storage.delete(imageId);
  },
});
