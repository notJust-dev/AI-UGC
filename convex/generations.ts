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
import { requireUserId, optionalUserId, SYSTEM_USER_ID } from "./lib/auth";
import { MAX_PROMPT_LENGTH, quote, VIDEO_MODELS, type ModelId } from "./lib/models";
import { MAX_IN_FLIGHT_VIDEOS, rateLimiter } from "./lib/rateLimits";
import { urlOf, urlsOf } from "./lib/storage";
import { setBalanceIfNewer } from "./lib/balance";
import { isTerminal } from "./lib/status";

export const INSUFFICIENT_CREDITS = "INSUFFICIENT_CREDITS";

function billingConfigured() {
  return !!process.env.REVENUECAT_SECRET_KEY && !!process.env.REVENUECAT_PROJECT_ID;
}

const settingsArgs = {
  prompt: v.string(),
  avatarId: v.optional(v.id("avatars")),
  productId: v.optional(v.id("products")),
  templateId: v.optional(v.id("templates")),
  modelId: v.string(),
  resolution: v.string(),
  duration: v.number(),
  variations: v.number(),
};

type SettingsArgs = {
  prompt: string;
  avatarId?: Id<"avatars">;
  productId?: Id<"products">;
  templateId?: Id<"templates">;
  modelId: string;
  resolution: string;
  duration: number;
  variations: number;
};

/** Shared validation; the client never supplies a price. */
async function validateSettings(ctx: MutationCtx, userId: string, a: SettingsArgs) {
  const prompt = a.prompt.trim();
  if (prompt.length < 3) throw new ConvexError("Describe the video you want");
  if (prompt.length > MAX_PROMPT_LENGTH) throw new ConvexError("That prompt is too long");
  const q = quote(a);
  if (!q.ok) throw new ConvexError(q.error);
  if (a.avatarId) {
    const avatar = await ctx.db.get(a.avatarId);
    if (!avatar || (avatar.ownerId !== undefined && avatar.ownerId !== userId)) {
      throw new ConvexError("Avatar not found");
    }
  }
  if (a.productId) {
    const product = await ctx.db.get(a.productId);
    if (!product || product.ownerId !== userId) throw new ConvexError("Product not found");
  }
  if (a.templateId && !(await ctx.db.get(a.templateId))) {
    throw new ConvexError("Template not found");
  }
  return { prompt, quote: q };
}

async function insertGeneration(
  ctx: MutationCtx,
  userId: string,
  clientRequestId: string,
  a: SettingsArgs,
  prompt: string,
  perVideo: number,
  billing: "revenuecat" | "none",
) {
  const now = Date.now();
  const model = VIDEO_MODELS[a.modelId as ModelId];
  const generationId = await ctx.db.insert("generations", {
    userId,
    clientRequestId,
    prompt,
    avatarId: a.avatarId,
    productId: a.productId,
    templateId: a.templateId,
    modelId: a.modelId,
    resolution: a.resolution,
    duration: a.duration,
    variations: a.variations,
    creditsTotal: perVideo * a.variations,
    billing,
    status: billing === "none" ? "charged" : "charging",
    stateAt: now,
    chargeAttempts: 0,
  });
  for (let i = 0; i < a.variations; i++) {
    await ctx.db.insert("videos", {
      generationId,
      userId,
      index: i,
      status: "queued",
      stateAt: now,
      attempts: 0,
      creditsCost: perVideo,
      token: crypto.randomUUID(),
      falEndpoint: model.endpoint,
      refundState: "none",
    });
  }
  return generationId;
}

/**
 * Starts a paid generation. Charging happens server-side right after this
 * mutation commits (billing.charge); nothing is generated until RevenueCat
 * confirms the spend.
 */
export const create = mutation({
  args: { clientRequestId: v.string(), ...settingsArgs },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    // Same request retried (double tap, network retry) → same generation.
    const existing = await ctx.db
      .query("generations")
      .withIndex("by_user_request", (q) =>
        q.eq("userId", userId).eq("clientRequestId", args.clientRequestId),
      )
      .unique();
    if (existing) return existing._id;

    if (!billingConfigured()) throw new ConvexError("Purchases aren't set up yet");
    const { prompt, quote: q } = await validateSettings(ctx, userId, args);

    const recent = await ctx.db
      .query("videos")
      .withIndex("by_user", (q2) => q2.eq("userId", userId))
      .order("desc")
      .take(50);
    const inFlight = recent.filter((r) => !isTerminal(r.status)).length;
    if (inFlight + args.variations > MAX_IN_FLIGHT_VIDEOS) {
      throw new ConvexError("You have too many videos rendering. Try again when some finish.");
    }

    // Advisory check against the mirror for an instant answer; RevenueCat's
    // own atomic spend in billing.charge is the authoritative check.
    const mirror = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q2) => q2.eq("userId", userId))
      .unique();
    if (mirror && mirror.balance < q.total) {
      throw new ConvexError({
        code: INSUFFICIENT_CREDITS,
        needed: q.total,
        balance: mirror.balance,
      });
    }

    await rateLimiter.limit(ctx, "generate", { key: userId, throws: true });

    const generationId = await insertGeneration(
      ctx,
      userId,
      args.clientRequestId,
      args,
      prompt,
      q.perVideo,
      "revenuecat",
    );
    await ctx.scheduler.runAfter(0, internal.billing.charge, { generationId });
    return generationId;
  },
});

/** Seeding only: runs the pipeline under the system owner, never charged. */
export const createUnbilled = internalMutation({
  args: settingsArgs,
  handler: async (ctx, args) => {
    const { prompt, quote: q } = await validateSettings(ctx, SYSTEM_USER_ID, args);
    const generationId = await insertGeneration(
      ctx,
      SYSTEM_USER_ID,
      crypto.randomUUID(),
      args,
      prompt,
      q.perVideo,
      "none",
    );
    await ctx.scheduler.runAfter(0, internal.pipeline.prepare, { generationId });
    return generationId;
  },
});

// ---------- state transitions (internal, compare-and-set) ----------

export const markCharged = internalMutation({
  args: {
    generationId: v.id("generations"),
    balance: v.optional(v.number()),
    syncedAt: v.number(),
  },
  handler: async (ctx, { generationId, balance, syncedAt }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen || gen.status !== "charging") return;
    await ctx.db.patch(generationId, { status: "charged", stateAt: Date.now() });
    if (balance !== undefined) await setBalanceIfNewer(ctx, gen.userId, balance, syncedAt);
    await ctx.scheduler.runAfter(0, internal.pipeline.prepare, { generationId });
  },
});

export const markRejected = internalMutation({
  args: { generationId: v.id("generations"), reason: v.string() },
  handler: async (ctx, { generationId, reason }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen || gen.status !== "charging") return;
    const now = Date.now();
    await ctx.db.patch(generationId, { status: "rejected", stateAt: now, error: reason });
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_generation", (q) => q.eq("generationId", generationId))
      .collect();
    // Nothing was charged, so there is nothing to refund.
    for (const video of videos) {
      await ctx.db.patch(video._id, { status: "failed", stateAt: now, error: reason });
    }
  },
});

export const markChargeRetry = internalMutation({
  args: { generationId: v.id("generations"), error: v.string() },
  handler: async (ctx, { generationId, error }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen || gen.status !== "charging") return;
    await ctx.db.patch(generationId, {
      stateAt: Date.now(),
      chargeAttempts: gen.chargeAttempts + 1,
      error,
    });
  },
});

/** Prompts are ready: move every queued video to "starting" and fan out. */
export const beginVideos = internalMutation({
  args: {
    generationId: v.id("generations"),
    enhancedPrompt: v.string(),
    framePrompt: v.string(),
  },
  handler: async (ctx, { generationId, enhancedPrompt, framePrompt }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen || gen.status !== "charged") return;
    await ctx.db.patch(generationId, { enhancedPrompt, framePrompt });
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_generation", (q) => q.eq("generationId", generationId))
      .collect();
    const now = Date.now();
    for (const video of videos) {
      if (video.status !== "queued") continue;
      await ctx.db.patch(video._id, { status: "starting", stateAt: now, attempts: 1 });
      await ctx.scheduler.runAfter(0, internal.falNode.startVideo, { videoId: video._id });
    }
  },
});

// ---------- reads ----------

export const getForCharge = internalQuery({
  args: { generationId: v.id("generations") },
  handler: async (ctx, { generationId }) => ctx.db.get(generationId),
});

/** Everything the prompt + frame steps need, with public URLs for fal. */
export const getContext = internalQuery({
  args: { generationId: v.id("generations") },
  handler: async (ctx, { generationId }) => {
    const gen = await ctx.db.get(generationId);
    if (!gen) return null;
    return { gen, ...(await loadReferences(ctx, gen)) };
  },
});

export async function loadReferences(
  ctx: Parameters<typeof urlsOf>[0],
  refs: { avatarId?: Id<"avatars">; productId?: Id<"products"> },
) {
  const avatar = refs.avatarId ? await ctx.db.get(refs.avatarId) : null;
  const product = refs.productId ? await ctx.db.get(refs.productId) : null;
  return {
    avatar: avatar
      ? {
          name: avatar.name,
          description: avatar.description ?? null,
          imageUrls: await urlsOf(ctx, avatar.imageIds),
        }
      : null,
    product: product
      ? {
          name: product.name,
          description: product.description,
          imageUrls: await urlsOf(ctx, product.imageIds),
        }
      : null,
  };
}

async function presentGeneration(
  ctx: Parameters<typeof urlsOf>[0],
  gen: Doc<"generations">,
) {
  const videos = await ctx.db
    .query("videos")
    .withIndex("by_generation", (q) => q.eq("generationId", gen._id))
    .collect();
  const model = VIDEO_MODELS[gen.modelId as ModelId];
  return {
    _id: gen._id,
    _creationTime: gen._creationTime,
    prompt: gen.prompt,
    enhancedPrompt: gen.enhancedPrompt ?? null,
    modelId: gen.modelId,
    modelName: model?.name ?? gen.modelId,
    resolution: gen.resolution,
    duration: gen.duration,
    variations: gen.variations,
    creditsTotal: gen.creditsTotal,
    status: gen.status,
    error: gen.error ?? null,
    avatarId: gen.avatarId ?? null,
    productId: gen.productId ?? null,
    videos: await Promise.all(
      videos
        .sort((a, b) => a.index - b.index)
        .map(async (vid) => ({
          _id: vid._id,
          index: vid.index,
          status: vid.status,
          error: vid.error ?? null,
          refunded: vid.refundState === "done",
          posterUrl: await urlOf(ctx, vid.posterId),
          videoUrl: await urlOf(ctx, vid.videoFileId),
        })),
    ),
  };
}

export const get = query({
  args: { id: v.id("generations") },
  handler: async (ctx, { id }) => {
    const userId = await optionalUserId(ctx);
    const gen = await ctx.db.get(id);
    if (!gen || gen.userId !== userId) return null;
    return presentGeneration(ctx, gen);
  },
});
