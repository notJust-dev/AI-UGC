import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

// RevenueCat REST API v2, server-side only (secret key lives in Convex env).
const RC_BASE = "https://api.revenuecat.com/v2";
export const CURRENCY_CODE = "CREDITS";

type RcResult =
  | { kind: "ok"; balance?: number }
  | { kind: "insufficient" }
  | { kind: "noCustomer" }
  | { kind: "retry"; error: string };

function config() {
  const key = process.env.REVENUECAT_SECRET_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!key || !projectId) throw new Error("RevenueCat is not configured");
  return { key, projectId };
}

function balanceFrom(json: unknown): number | undefined {
  const items = (json as { items?: { currency_code?: string; balance?: number }[] })?.items;
  const match = items?.find((i) => i.currency_code === CURRENCY_CODE);
  if (match && typeof match.balance === "number") return match.balance;
  // A customer with no CREDITS row has a zero balance.
  return Array.isArray(items) ? 0 : undefined;
}

function customerPath(projectId: string, userId: string) {
  return `${RC_BASE}/projects/${projectId}/customers/${encodeURIComponent(userId)}/virtual_currencies`;
}

/** Atomic spend/deposit. RevenueCat rejects (422) and takes nothing if the balance is short. */
async function adjust(
  userId: string,
  amount: number,
  idempotencyKey: string,
  reference: string,
): Promise<RcResult> {
  const { key, projectId } = config();
  let res: Response;
  try {
    res = await fetch(`${customerPath(projectId, userId)}/transactions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ adjustments: { [CURRENCY_CODE]: amount }, reference }),
    });
  } catch (e) {
    return { kind: "retry", error: `network: ${String(e)}` };
  }
  if (res.ok) return { kind: "ok", balance: balanceFrom(await res.json().catch(() => null)) };
  const body = await res.text().catch(() => "");
  if (res.status === 422 && amount < 0) return { kind: "insufficient" };
  if (res.status === 404) return { kind: "noCustomer" };
  // 409/423/429/5xx and anything unexpected: retry later with the same key.
  return { kind: "retry", error: `RevenueCat ${res.status}: ${body.slice(0, 300)}` };
}

async function readBalance(userId: string): Promise<number | "retry"> {
  const { key, projectId } = config();
  try {
    const res = await fetch(`${customerPath(projectId, userId)}?include_empty_balances=true`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.status === 404) return 0;
    if (!res.ok) return "retry";
    return balanceFrom(await res.json()) ?? 0;
  } catch {
    return "retry";
  }
}

/** Takes the credits for a generation. Safe to call repeatedly (idempotent). */
export const charge = internalAction({
  args: { generationId: v.id("generations") },
  handler: async (ctx, { generationId }) => {
    const gen = await ctx.runQuery(internal.generations.getForCharge, { generationId });
    if (!gen || gen.status !== "charging" || gen.billing !== "revenuecat") return;
    const startedAt = Date.now();
    const result = await adjust(
      gen.userId,
      -gen.creditsTotal,
      `spend:${generationId}`,
      `generation:${generationId}`,
    );
    switch (result.kind) {
      case "ok":
        await ctx.runMutation(internal.generations.markCharged, {
          generationId,
          balance: result.balance,
          syncedAt: startedAt,
        });
        return;
      case "insufficient":
      case "noCustomer":
        await ctx.runMutation(internal.generations.markRejected, {
          generationId,
          reason: "Not enough credits",
        });
        await ctx.scheduler.runAfter(0, internal.billing.syncUser, { userId: gen.userId });
        return;
      case "retry":
        console.warn("charge retry", generationId, result.error);
        await ctx.runMutation(internal.generations.markChargeRetry, {
          generationId,
          error: result.error,
        });
    }
  },
});

/** Returns a failed video's credits. Safe to call repeatedly (idempotent). */
export const refund = internalAction({
  args: { videoId: v.id("videos") },
  handler: async (ctx, { videoId }) => {
    const data = await ctx.runQuery(internal.videos.getForWorker, { videoId });
    if (!data || data.video.refundState !== "pending") return;
    const startedAt = Date.now();
    if (data.gen.billing !== "revenuecat") {
      await ctx.runMutation(internal.videos.markRefunded, { videoId, syncedAt: startedAt });
      return;
    }
    const result = await adjust(
      data.video.userId,
      data.video.creditsCost,
      `refund:${videoId}`,
      `refund:${videoId}`,
    );
    if (result.kind === "ok") {
      await ctx.runMutation(internal.videos.markRefunded, {
        videoId,
        balance: result.balance,
        syncedAt: startedAt,
      });
    } else {
      // Stays "pending"; the watchdog retries with the same idempotency key.
      console.error("refund failed, will retry", videoId, result);
    }
  },
});

/** Refreshes the Convex mirror from RevenueCat. */
export const syncUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const startedAt = Date.now();
    const balance = await readBalance(userId);
    if (balance === "retry") return null;
    await ctx.runMutation(internal.credits.setBalance, { userId, balance, syncedAt: startedAt });
    return balance;
  },
});
