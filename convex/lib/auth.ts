import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

/** Returns the Clerk user id (JWT subject) or throws. */
export async function requireUserId(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Not signed in");
  return identity.subject;
}

export async function optionalUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.subject ?? null;
}

/** Owner id used for content created by internal seeding. */
export const SYSTEM_USER_ID = "system";
