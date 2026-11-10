import { mutation } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { rateLimiter } from "./lib/rateLimits";

/** Short-lived URL the app POSTs a photo to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "upload", { key: userId, throws: true });
    return await ctx.storage.generateUploadUrl();
  },
});
