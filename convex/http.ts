import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import { fetchFalJwks, verifyFalWebhook } from "./lib/falSignature";
import { friendlyFalError } from "./lib/status";

const http = httpRouter();

/** fal queue completion webhook. Verified, recorded durably, then acknowledged. */
http.route({
  path: "/fal/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = new Uint8Array(await req.arrayBuffer());

    let keys = await ctx.runQuery(internal.webhooks.getFalJwks, {});
    let valid = keys ? await verifyFalWebhook(req.headers, raw, keys) : false;
    if (!valid) {
      // Keys may have rotated (or the cache is empty): refresh once.
      keys = await fetchFalJwks();
      await ctx.runMutation(internal.webhooks.saveFalJwks, { keys });
      valid = await verifyFalWebhook(req.headers, raw, keys);
    }
    if (!valid) return new Response("invalid signature", { status: 401 });

    const url = new URL(req.url);
    const videoId = url.searchParams.get("v");
    const token = url.searchParams.get("t");
    if (!videoId || !token) return new Response("missing video", { status: 400 });

    let body: { request_id?: string; status?: string; error?: unknown; payload?: unknown };
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return new Response("bad json", { status: 400 });
    }
    if (!body.request_id) return new Response("missing request id", { status: 400 });

    const ok = body.status === "OK";
    try {
      await ctx.runMutation(internal.videos.recordFalResult, {
        videoId: videoId as Id<"videos">,
        token,
        requestId: body.request_id,
        ok,
        error: ok ? undefined : friendlyFalError({ error: body.error, payload: body.payload }),
      });
    } catch (e) {
      console.error("fal webhook record failed", e);
      return new Response("retry", { status: 500 }); // fal retries delivery
    }
    return new Response("ok", { status: 200 });
  }),
});

/** RevenueCat events: purchases, renewals, refunds and dashboard edits change the balance. */
http.route({
  path: "/revenuecat/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    const auth = req.headers.get("authorization") ?? "";
    if (!secret || (auth !== secret && auth !== `Bearer ${secret}`)) {
      return new Response("unauthorized", { status: 401 });
    }
    const body = (await req.json().catch(() => null)) as {
      event?: { app_user_id?: string; aliases?: string[]; transferred_to?: string[] };
    } | null;
    const event = body?.event;
    const ids = new Set<string>(
      [event?.app_user_id, ...(event?.transferred_to ?? [])].filter(
        (id): id is string => !!id && !id.startsWith("$RCAnonymousID"),
      ),
    );
    for (const userId of ids) {
      await ctx.scheduler.runAfter(0, internal.billing.syncUser, { userId });
    }
    return new Response("ok", { status: 200 });
  }),
});

export default http;
