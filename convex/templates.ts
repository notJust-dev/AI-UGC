import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import { SYSTEM_USER_ID } from "./lib/auth";
import { VIDEO_MODELS, type ModelId } from "./lib/models";
import { urlOf } from "./lib/storage";

async function present(ctx: QueryCtx, t: Doc<"templates">) {
  const avatar = t.avatarId ? await ctx.db.get(t.avatarId) : null;
  return {
    _id: t._id,
    title: t.title,
    description: t.description ?? null,
    prompt: t.prompt,
    modelId: t.modelId,
    modelName: VIDEO_MODELS[t.modelId as ModelId]?.name ?? t.modelId,
    resolution: t.resolution,
    duration: t.duration,
    posterUrl: await urlOf(ctx, t.posterId),
    avatar: avatar
      ? { _id: avatar._id, name: avatar.name, coverUrl: await urlOf(ctx, avatar.coverImageId) }
      : null,
  };
}

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query("templates")
      .withIndex("by_order")
      .take(Math.min(limit ?? 50, 100));
    return Promise.all(rows.map((t) => present(ctx, t)));
  },
});

export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    const t = await ctx.db.get(id);
    if (!t) return null;
    return { ...(await present(ctx, t)), videoUrl: await urlOf(ctx, t.videoFileId) };
  },
});

/** Seeding: publish a completed system video as an inspiration template. */
export const promote = internalMutation({
  args: {
    videoId: v.id("videos"),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, { videoId, title, description, order }) => {
    const video = await ctx.db.get(videoId);
    if (!video || video.userId !== SYSTEM_USER_ID) throw new ConvexError("Not a system video");
    if (video.status !== "completed" || !video.videoFileId || !video.posterId) {
      throw new ConvexError(`Video is ${video.status}, not completed`);
    }
    const gen = await ctx.db.get(video.generationId);
    if (!gen) throw new ConvexError("Generation missing");
    return await ctx.db.insert("templates", {
      title,
      description,
      prompt: gen.prompt,
      avatarId: gen.avatarId,
      modelId: gen.modelId,
      resolution: gen.resolution,
      duration: gen.duration,
      posterId: video.posterId,
      videoFileId: video.videoFileId,
      order,
    });
  },
});
