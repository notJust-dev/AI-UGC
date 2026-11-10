import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { failVideo } from "./videos";

const MINUTE = 60_000;
const BATCH = 25;

// Retry / timeout policy.
const CHARGE_RETRY_AFTER = 1 * MINUTE;
const CHARGE_GIVE_UP_AFTER = 15 * MINUTE;
const PREPARE_RETRY_AFTER = 3 * MINUTE;
const START_RETRY_AFTER = 4 * MINUTE;
const POLL_AFTER = 2 * MINUTE;
const RENDER_TIMEOUT = 25 * MINUTE;
const FINALIZE_RETRY_AFTER = 5 * MINUTE;
const REFUND_RETRY_AFTER = 2 * MINUTE;
const MAX_ATTEMPTS = 3;

/** Runs every minute. Each branch is idempotent and guarded by compare-and-set. */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Charges RevenueCat never confirmed: retry with the same idempotency key.
    const charging = await ctx.db
      .query("generations")
      .withIndex("by_status_stateAt", (q) =>
        q.eq("status", "charging").lt("stateAt", now - CHARGE_RETRY_AFTER),
      )
      .take(BATCH);
    for (const gen of charging) {
      if (now - gen._creationTime > CHARGE_GIVE_UP_AFTER) {
        // Never auto-refund an unconfirmed spend; flag it for review instead.
        await ctx.db.patch(gen._id, {
          status: "chargeUnknown",
          stateAt: now,
          error: "Payment couldn't be confirmed",
        });
        const vids = await ctx.db
          .query("videos")
          .withIndex("by_generation", (q) => q.eq("generationId", gen._id))
          .collect();
        for (const vid of vids) {
          await ctx.db.patch(vid._id, {
            status: "failed",
            stateAt: now,
            error: "We couldn't confirm the payment. Contact support if credits were taken.",
          });
        }
        continue;
      }
      await ctx.db.patch(gen._id, { stateAt: now });
      await ctx.scheduler.runAfter(0, internal.billing.charge, { generationId: gen._id });
    }

    // 2. Charged generations whose prompt step never ran.
    const charged = await ctx.db
      .query("generations")
      .withIndex("by_status_stateAt", (q) =>
        q.eq("status", "charged").lt("stateAt", now - PREPARE_RETRY_AFTER),
      )
      .take(BATCH);
    for (const gen of charged) {
      if (gen.framePrompt) continue;
      await ctx.db.patch(gen._id, { stateAt: now });
      await ctx.scheduler.runAfter(0, internal.pipeline.prepare, { generationId: gen._id });
    }

    // 3. Videos stuck before submission.
    const starting = await ctx.db
      .query("videos")
      .withIndex("by_status_stateAt", (q) =>
        q.eq("status", "starting").lt("stateAt", now - START_RETRY_AFTER),
      )
      .take(BATCH);
    for (const vid of starting) {
      if (vid.attempts >= MAX_ATTEMPTS) {
        await failVideo(ctx, vid, "We couldn't start this video. Your credits were refunded.");
        continue;
      }
      await ctx.db.patch(vid._id, { stateAt: now, attempts: vid.attempts + 1 });
      await ctx.scheduler.runAfter(0, internal.falNode.startVideo, { videoId: vid._id });
    }

    // 4. Submitted videos: poll when the webhook is late, time out eventually.
    const submitted = await ctx.db
      .query("videos")
      .withIndex("by_status_stateAt", (q) =>
        q.eq("status", "submitted").lt("stateAt", now - POLL_AFTER),
      )
      .take(BATCH);
    for (const vid of submitted) {
      if (now - (vid.submittedAt ?? vid.stateAt) > RENDER_TIMEOUT) {
        await ctx.db.patch(vid._id, { stateAt: now });
        await ctx.scheduler.runAfter(0, internal.falNode.cancelAndFail, {
          videoId: vid._id,
          error: "The model took too long. Your credits were refunded; please try again.",
        });
        continue;
      }
      await ctx.db.patch(vid._id, { stateAt: now });
      await ctx.scheduler.runAfter(0, internal.falNode.pollVideo, { videoId: vid._id });
    }

    // 5. Downloads that didn't finish (the fal URL stays valid for days).
    const finalizing = await ctx.db
      .query("videos")
      .withIndex("by_status_stateAt", (q) =>
        q.eq("status", "finalizing").lt("stateAt", now - FINALIZE_RETRY_AFTER),
      )
      .take(BATCH);
    for (const vid of finalizing) {
      if (vid.attempts >= MAX_ATTEMPTS) {
        await failVideo(ctx, vid, "We couldn't save this video. Your credits were refunded.");
        continue;
      }
      await ctx.db.patch(vid._id, { stateAt: now, attempts: vid.attempts + 1 });
      await ctx.scheduler.runAfter(0, internal.falNode.finalizeVideo, { videoId: vid._id });
    }

    // 6. Refunds that haven't been confirmed yet.
    const refunds = await ctx.db
      .query("videos")
      .withIndex("by_refund_stateAt", (q) =>
        q.eq("refundState", "pending").lt("stateAt", now - REFUND_RETRY_AFTER),
      )
      .take(BATCH);
    for (const vid of refunds) {
      await ctx.db.patch(vid._id, { stateAt: now });
      await ctx.scheduler.runAfter(0, internal.billing.refund, { videoId: vid._id });
    }
  },
});
