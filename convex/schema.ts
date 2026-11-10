import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const generationStatus = v.union(
  v.literal("charging"), // waiting for RevenueCat to confirm the spend
  v.literal("charged"), // credits taken, pipeline running
  v.literal("rejected"), // not enough credits (nothing was taken)
  v.literal("chargeUnknown"), // RevenueCat never confirmed; needs manual review
);

export const videoStatus = v.union(
  v.literal("queued"),
  v.literal("starting"), // first frame + fal submission in progress
  v.literal("submitted"), // waiting for fal
  v.literal("finalizing"), // copying the mp4 into Convex storage
  v.literal("completed"),
  v.literal("failed"),
);

export const refundState = v.union(
  v.literal("none"),
  v.literal("pending"),
  v.literal("done"),
);

export default defineSchema({
  // Public catalog avatars have no ownerId.
  avatars: defineTable({
    ownerId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    imageIds: v.array(v.id("_storage")),
    coverImageId: v.id("_storage"),
  })
    .index("by_owner", ["ownerId"]),

  products: defineTable({
    ownerId: v.string(),
    name: v.string(),
    description: v.string(),
    imageIds: v.array(v.id("_storage")),
  }).index("by_owner", ["ownerId"]),

  // Curated inspiration videos.
  templates: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    prompt: v.string(),
    avatarId: v.optional(v.id("avatars")),
    modelId: v.string(),
    resolution: v.string(),
    duration: v.number(),
    posterId: v.id("_storage"),
    videoFileId: v.id("_storage"),
    order: v.number(),
  }).index("by_order", ["order"]),

  generations: defineTable({
    userId: v.string(),
    clientRequestId: v.string(),
    prompt: v.string(),
    enhancedPrompt: v.optional(v.string()),
    framePrompt: v.optional(v.string()),
    avatarId: v.optional(v.id("avatars")),
    productId: v.optional(v.id("products")),
    templateId: v.optional(v.id("templates")),
    modelId: v.string(),
    resolution: v.string(),
    duration: v.number(),
    variations: v.number(),
    creditsTotal: v.number(),
    // "revenuecat" for users; "none" for internal seeding (never charged).
    billing: v.union(v.literal("revenuecat"), v.literal("none")),
    status: generationStatus,
    stateAt: v.number(),
    chargeAttempts: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_request", ["userId", "clientRequestId"])
    .index("by_status_stateAt", ["status", "stateAt"]),

  // One row per variation.
  videos: defineTable({
    generationId: v.id("generations"),
    userId: v.string(),
    index: v.number(),
    status: videoStatus,
    stateAt: v.number(),
    attempts: v.number(),
    creditsCost: v.number(),
    // Random per-video secret carried in the fal webhook URL.
    token: v.string(),
    falEndpoint: v.string(),
    falRequestId: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    posterId: v.optional(v.id("_storage")),
    videoFileId: v.optional(v.id("_storage")),
    error: v.optional(v.string()),
    refundState: refundState,
  })
    .index("by_user", ["userId"])
    .index("by_generation", ["generationId"])
    .index("by_status_stateAt", ["status", "stateAt"])
    .index("by_refund_stateAt", ["refundState", "stateAt"]),

  // Mirror of the RevenueCat CREDITS balance, so every platform reads one query.
  creditBalances: defineTable({
    userId: v.string(),
    balance: v.number(),
    syncedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Cached fal webhook verification keys.
  falJwks: defineTable({
    keys: v.array(v.string()),
    fetchedAt: v.number(),
  }),
});
