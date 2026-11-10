"use node";

// fal.ai worker steps. Node runtime for the memory needed to copy mp4s into storage.
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, type ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { falAppId, VIDEO_MODELS, type ModelId, type Resolution } from "./lib/models";
import { friendlyFalError } from "./lib/status";

const FAL_RUN = "https://fal.run";
const FAL_QUEUE = "https://queue.fal.run";
const FRAME_TEXT_TO_IMAGE = "google/nano-banana-2.1";
const FRAME_EDIT = "google/nano-banana-2.1/edit";
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

/** Errors that will not succeed on retry (bad input, safety filter). */
class PermanentFalError extends Error {}

function falKey() {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is not set");
  return key;
}

async function falFetch(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Key ${falKey()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (res.ok) return res.json();
  const body = await res.text().catch(() => "");
  const message = `fal ${res.status}: ${body.slice(0, 500)}`;
  // 4xx (except rate limits / timeouts) is a problem with the request itself.
  if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
    throw new PermanentFalError(message);
  }
  throw new Error(message);
}

async function storeFromUrl(ctx: ActionCtx, url: string, maxBytes: number) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const length = Number(res.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new PermanentFalError("file too large");
  const blob = await res.blob();
  if (blob.size > maxBytes) throw new PermanentFalError("file too large");
  return ctx.storage.store(blob);
}

/** First frame (cheap moderation gate + poster), then submit image-to-video to the fal queue. */
export const startVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const data = await ctx.runQuery(internal.videos.getForWorker, { videoId });
    if (!data || data.video.status !== "starting") return;
    const { video, gen, avatar, product } = data;
    const model = VIDEO_MODELS[gen.modelId as ModelId];
    try {
      let frameUrl = data.posterUrl;
      if (!frameUrl) {
        const references = [...(avatar?.imageUrls ?? []), ...(product?.imageUrls ?? [])];
        const framePrompt = gen.framePrompt ?? gen.prompt;
        const result = (await falFetch(
          `${FAL_RUN}/${references.length ? FRAME_EDIT : FRAME_TEXT_TO_IMAGE}`,
          {
            method: "POST",
            body: JSON.stringify({
              prompt: framePrompt,
              ...(references.length ? { image_urls: references } : {}),
              aspect_ratio: "9:16",
              resolution: "2K",
              output_format: "jpeg",
              num_images: 1,
              seed: Math.floor(Math.random() * 2_147_483_647),
            }),
          },
        )) as { images?: { url: string }[] };
        const image = result.images?.[0]?.url;
        if (!image) throw new PermanentFalError("no_media_generated: frame");
        const posterId = await storeFromUrl(ctx, image, 30 * 1024 * 1024);
        await ctx.runMutation(internal.videos.setPoster, { videoId, posterId });
        frameUrl = await ctx.storage.getUrl(posterId);
        if (!frameUrl) throw new Error("poster url missing");
      }

      const site = process.env.CONVEX_SITE_URL;
      if (!site) throw new Error("CONVEX_SITE_URL missing");
      const webhook = `${site}/fal/webhook?v=${videoId}&t=${video.token}`;
      const input = model.buildInput({
        prompt: gen.enhancedPrompt ?? gen.prompt,
        imageUrl: frameUrl,
        duration: gen.duration,
        resolution: gen.resolution as Resolution,
      });
      const submitted = (await falFetch(
        `${FAL_QUEUE}/${video.falEndpoint}?fal_webhook=${encodeURIComponent(webhook)}`,
        { method: "POST", body: JSON.stringify(input) },
      )) as { request_id?: string };
      if (!submitted.request_id) throw new Error("fal returned no request id");
      await ctx.runMutation(internal.videos.markSubmitted, {
        videoId,
        requestId: submitted.request_id,
      });
    } catch (e) {
      if (e instanceof PermanentFalError) {
        console.warn("startVideo permanent failure", videoId, e.message);
        await ctx.runMutation(internal.videos.fail, { videoId, error: friendlyFalError(e.message) });
        return;
      }
      // Transient: stay in "starting"; the watchdog retries a limited number of times.
      console.error("startVideo transient failure", videoId, e);
    }
  },
});

/** Copies the finished mp4 from fal into Convex storage. */
export const finalizeVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const data = await ctx.runQuery(internal.videos.getForWorker, { videoId });
    if (!data || data.video.status !== "finalizing" || !data.video.falRequestId) return;
    const { video } = data;
    try {
      // Re-read the result with our own key; the webhook payload is only a hint.
      const result = (await falFetch(
        `${FAL_QUEUE}/${falAppId(video.falEndpoint)}/requests/${video.falRequestId}`,
      )) as { video?: { url?: string } };
      const url = result.video?.url;
      if (!url) throw new PermanentFalError("no_media_generated: video");
      const fileId: Id<"_storage"> = await storeFromUrl(ctx, url, MAX_VIDEO_BYTES);
      await ctx.runMutation(internal.videos.markCompleted, { videoId, fileId });
    } catch (e) {
      if (e instanceof PermanentFalError) {
        await ctx.runMutation(internal.videos.fail, { videoId, error: friendlyFalError(e.message) });
        return;
      }
      console.error("finalizeVideo transient failure", videoId, e);
    }
  },
});

/** Watchdog fallback when a webhook never arrives. */
export const pollVideo = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const data = await ctx.runQuery(internal.videos.getForWorker, { videoId });
    if (!data || data.video.status !== "submitted" || !data.video.falRequestId) return;
    const { video } = data;
    const requestId = data.video.falRequestId;
    const base = `${FAL_QUEUE}/${falAppId(video.falEndpoint)}/requests/${requestId}`;
    try {
      const status = (await falFetch(`${base}/status`)) as { status?: string; error?: unknown };
      if (status.status === "COMPLETED") {
        // finalizeVideo reads the result; an errored job fails there permanently.
        await ctx.runMutation(internal.videos.recordFalResult, {
          videoId,
          requestId,
          ok: true,
        });
      }
    } catch (e) {
      if (e instanceof PermanentFalError) {
        await ctx.runMutation(internal.videos.fail, { videoId, error: friendlyFalError(e.message) });
      }
    }
  },
});

/** Best-effort cancel before a timeout refund, so a late result can't be produced. */
export const cancelAndFail = internalAction({
  args: { videoId: v.id("videos"), error: v.string() },
  handler: async (ctx, { videoId, error }) => {
    const data = await ctx.runQuery(internal.videos.getForWorker, { videoId });
    if (!data) return;
    const { video } = data;
    if (video.falRequestId) {
      await falFetch(
        `${FAL_QUEUE}/${falAppId(video.falEndpoint)}/requests/${video.falRequestId}/cancel`,
        { method: "PUT" },
      ).catch(() => undefined);
    }
    await ctx.runMutation(internal.videos.fail, { videoId, error });
  },
});

/** Seeding helper: one text-to-image portrait stored in Convex. */
export const generatePortrait = internalAction({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }): Promise<Id<"_storage">> => {
    const result = (await falFetch(`${FAL_RUN}/${FRAME_TEXT_TO_IMAGE}`, {
      method: "POST",
      body: JSON.stringify({
        prompt,
        aspect_ratio: "3:4",
        resolution: "2K",
        output_format: "jpeg",
        num_images: 1,
      }),
    })) as { images?: { url: string }[] };
    const url = result.images?.[0]?.url;
    if (!url) throw new Error("no portrait generated");
    return storeFromUrl(ctx, url, 30 * 1024 * 1024);
  },
});
