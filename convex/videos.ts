import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { setBalanceIfNewer } from "./lib/balance";
import { VIDEO_MODELS, type ModelId } from "./lib/models";
import { isTerminal } from "./lib/status";
import { urlOf } from "./lib/storage";
import { loadReferences } from "./generations";

/**
 * Single place a video fails. Idempotent: a terminal video is left alone, and
 * a refund is queued at most once (billing.refund also uses an idempotency key).
 */
export async function failVideo(ctx: MutationCtx, video: Doc<"videos">, error: string) {
  if (isTerminal(video.status)) return;
  const gen = await ctx.db.get(video.generationId);
  const wasCharged = gen?.status === "charged" && gen.billing === "revenuecat";
  await ctx.db.patch(video._id, {
    status: "failed",
    stateAt: Date.now(),
    error,
    refundState: wasCharged ? "pending" : "none",
  });
  if (wasCharged) {
    await ctx.scheduler.runAfter(0, internal.billing.refund, { videoId: video._id });
  }
}

export const fail = internalMutation({
  args: { videoId: v.id("videos"), error: v.string() },
  handler: async (ctx, { videoId, error }) => {
    const video = await ctx.db.get(videoId);
    if (video) await failVideo(ctx, video, error);
  },
});

export const setPoster = internalMutation({
  args: { videoId: v.id("videos"), posterId: v.id("_storage") },
  handler: async (ctx, { videoId, posterId }) => {
    const video = await ctx.db.get(videoId);
    if (!video || video.status !== "starting" || video.posterId) {
      // Lost the race (or already failed): don't leak the file.
      await ctx.storage.delete(posterId);
      return;
    }
    await ctx.db.patch(videoId, { posterId, stateAt: Date.now() });
  },
});

export const markSubmitted = internalMutation({
  args: { videoId: v.id("videos"), requestId: v.string() },
  handler: async (ctx, { videoId, requestId }) => {
    const video = await ctx.db.get(videoId);
    if (!video || video.status !== "starting") return;
    await ctx.db.patch(videoId, {
      status: "submitted",
      falRequestId: requestId,
      submittedAt: Date.now(),
      stateAt: Date.now(),
    });
  },
});

/**
 * Result from the fal webhook or the watchdog poll. The webhook can arrive
 * before markSubmitted ran, so "starting" is accepted too.
 */
export const recordFalResult = internalMutation({
  args: {
    videoId: v.id("videos"),
    token: v.optional(v.string()),
    requestId: v.string(),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.videoId);
    if (!video) return { accepted: false };
    if (args.token !== undefined && args.token !== video.token) return { accepted: false };
    if (video.status !== "starting" && video.status !== "submitted") {
      return { accepted: true }; // duplicate or late delivery: no-op
    }
    if (video.falRequestId && video.falRequestId !== args.requestId) {
      return { accepted: true }; // result for an abandoned duplicate submission
    }
    if (!args.ok) {
      await failVideo(ctx, video, args.error ?? "Rendering failed");
      return { accepted: true };
    }
    await ctx.db.patch(video._id, {
      status: "finalizing",
      falRequestId: args.requestId,
      stateAt: Date.now(),
      attempts: 1,
    });
    await ctx.scheduler.runAfter(0, internal.falNode.finalizeVideo, { videoId: video._id });
    return { accepted: true };
  },
});

export const markCompleted = internalMutation({
  args: { videoId: v.id("videos"), fileId: v.id("_storage") },
  handler: async (ctx, { videoId, fileId }) => {
    const video = await ctx.db.get(videoId);
    if (!video || video.status !== "finalizing") {
      await ctx.storage.delete(fileId);
      return;
    }
    await ctx.db.patch(videoId, { status: "completed", videoFileId: fileId, stateAt: Date.now() });
  },
});

export const markRefunded = internalMutation({
  args: {
    videoId: v.id("videos"),
    balance: v.optional(v.number()),
    syncedAt: v.number(),
  },
  handler: async (ctx, { videoId, balance, syncedAt }) => {
    const video = await ctx.db.get(videoId);
    if (!video || video.refundState !== "pending") return;
    await ctx.db.patch(videoId, { refundState: "done" });
    if (balance !== undefined) await setBalanceIfNewer(ctx, video.userId, balance, syncedAt);
  },
});

/** Bumps the attempt counter before the watchdog retries a step. */
export const touchForRetry = internalMutation({
  args: { videoId: v.id("videos"), status: v.string() },
  handler: async (ctx, { videoId, status }) => {
    const video = await ctx.db.get(videoId);
    if (!video || video.status !== status) return false;
    await ctx.db.patch(videoId, { stateAt: Date.now(), attempts: video.attempts + 1 });
    return true;
  },
});

export const getForWorker = internalQuery({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const video = await ctx.db.get(videoId);
    if (!video) return null;
    const gen = await ctx.db.get(video.generationId);
    if (!gen) return null;
    return {
      video,
      gen,
      posterUrl: await urlOf(ctx, video.posterId),
      ...(await loadReferences(ctx, gen)),
    };
  },
});

// ---------- public ----------

async function presentVideo(
  ctx: Parameters<typeof urlOf>[0],
  video: Doc<"videos">,
  gen: Doc<"generations"> | null,
) {
  return {
    _id: video._id,
    _creationTime: video._creationTime,
    generationId: video.generationId,
    index: video.index,
    status: video.status,
    error: video.error ?? null,
    refunded: video.refundState === "done",
    posterUrl: await urlOf(ctx, video.posterId),
    prompt: gen?.prompt ?? "",
    modelName: gen ? (VIDEO_MODELS[gen.modelId as ModelId]?.name ?? gen.modelId) : "",
    duration: gen?.duration ?? 0,
    generationStatus: gen?.status ?? "charged",
  };
}

export const listMine = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await optionalUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit ?? 60, 200));
    const gens = new Map<Id<"generations">, Doc<"generations"> | null>();
    for (const r of rows) {
      if (!gens.has(r.generationId)) gens.set(r.generationId, await ctx.db.get(r.generationId));
    }
    return Promise.all(rows.map((r) => presentVideo(ctx, r, gens.get(r.generationId) ?? null)));
  },
});

export const get = query({
  args: { id: v.id("videos") },
  handler: async (ctx, { id }) => {
    const userId = await optionalUserId(ctx);
    const video = await ctx.db.get(id);
    if (!video || video.userId !== userId) return null;
    const gen = await ctx.db.get(video.generationId);
    const siblings = await ctx.db
      .query("videos")
      .withIndex("by_generation", (q) => q.eq("generationId", video.generationId))
      .collect();
    return {
      ...(await presentVideo(ctx, video, gen)),
      videoUrl: await urlOf(ctx, video.videoFileId),
      enhancedPrompt: gen?.enhancedPrompt ?? null,
      avatarId: gen?.avatarId ?? null,
      productId: gen?.productId ?? null,
      modelId: gen?.modelId ?? null,
      resolution: gen?.resolution ?? null,
      siblings: siblings
        .sort((a, b) => a.index - b.index)
        .map((s) => ({ _id: s._id, index: s.index, status: s.status })),
    };
  },
});

export const remove = mutation({
  args: { id: v.id("videos") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const video = await ctx.db.get(id);
    if (!video || video.userId !== userId) throw new ConvexError("Video not found");
    if (!isTerminal(video.status)) throw new ConvexError("Wait until the video finishes");
    await ctx.db.delete(id);
    if (video.posterId) await ctx.storage.delete(video.posterId);
    if (video.videoFileId) await ctx.storage.delete(video.videoFileId);
  },
});
