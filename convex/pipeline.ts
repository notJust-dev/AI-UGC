import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ConvexError, v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { action, internalAction, internalQuery } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { MAX_PROMPT_LENGTH } from "./lib/models";
import {
  describeContext,
  ENHANCE_SYSTEM,
  ENHANCER_MODEL,
  fallbackPrompts,
  FINAL_SYSTEM,
  type PromptContext,
} from "./lib/promptDesign";
import { rateLimiter } from "./lib/rateLimits";
import { loadReferences } from "./generations";

function client() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  // Convex retries via the watchdog/fallbacks; keep SDK retries modest.
  return new Anthropic({ maxRetries: 1, timeout: 90_000 });
}

const FinalPrompts = z.object({
  frame_prompt: z.string(),
  video_prompt: z.string(),
});

async function writeFinalPrompts(c: PromptContext) {
  const response = await client().beta.messages.parse({
    model: ENHANCER_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(FinalPrompts) },
    system: [{ type: "text", text: FINAL_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: describeContext(c) }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`enhancer returned no prompts (${response.stop_reason})`);
  }
  return {
    framePrompt: response.parsed_output.frame_prompt.trim(),
    videoPrompt: response.parsed_output.video_prompt.trim(),
  };
}

/** Internal pipeline step: write the frame + video prompts, then start each variation. */
export const prepare = internalAction({
  args: { generationId: v.id("generations") },
  handler: async (ctx, { generationId }) => {
    const data = await ctx.runQuery(internal.generations.getContext, { generationId });
    if (!data || data.gen.status !== "charged" || data.gen.framePrompt) return;
    const c: PromptContext = {
      idea: data.gen.prompt,
      durationSeconds: data.gen.duration,
      avatar: data.avatar && {
        name: data.avatar.name,
        description: data.avatar.description,
        imageCount: data.avatar.imageUrls.length,
      },
      product: data.product && {
        name: data.product.name,
        description: data.product.description,
        imageCount: data.product.imageUrls.length,
      },
    };
    let prompts: { framePrompt: string; videoPrompt: string };
    try {
      prompts = await writeFinalPrompts(c);
    } catch (e) {
      console.error("enhancer failed, using fallback prompts", generationId, e);
      prompts = fallbackPrompts(c);
    }
    await ctx.runMutation(internal.generations.beginVideos, {
      generationId,
      enhancedPrompt: prompts.videoPrompt,
      framePrompt: prompts.framePrompt,
    });
  },
});

export const enhanceContext = internalQuery({
  args: {
    userId: v.string(),
    avatarId: v.optional(v.id("avatars")),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, { userId, avatarId, productId }) => {
    const avatar = avatarId ? await ctx.db.get(avatarId) : null;
    const product = productId ? await ctx.db.get(productId) : null;
    return loadReferences(ctx, {
      avatarId: avatar && (avatar.ownerId === undefined || avatar.ownerId === userId) ? avatarId : undefined,
      productId: product && product.ownerId === userId ? productId : undefined,
    });
  },
});

/** The ✨ Enhance button: rough idea → polished prompt the user can edit. */
export const enhance = action({
  args: {
    prompt: v.string(),
    duration: v.number(),
    avatarId: v.optional(v.id("avatars")),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args): Promise<string> => {
    const userId = await requireUserId(ctx);
    const idea = args.prompt.trim();
    if (idea.length < 3) throw new ConvexError("Write a few words about your video first");
    if (idea.length > MAX_PROMPT_LENGTH) throw new ConvexError("That prompt is too long");
    await rateLimiter.limit(ctx, "enhance", { key: userId, throws: true });

    const refs = await ctx.runQuery(internal.pipeline.enhanceContext, {
      userId,
      avatarId: args.avatarId,
      productId: args.productId,
    });
    const context = describeContext({
      idea,
      durationSeconds: Math.min(Math.max(args.duration, 3), 30),
      avatar: refs.avatar && {
        name: refs.avatar.name,
        description: refs.avatar.description,
        imageCount: refs.avatar.imageUrls.length,
      },
      product: refs.product && {
        name: refs.product.name,
        description: refs.product.description,
        imageCount: refs.product.imageUrls.length,
      },
    });

    const response = await client().beta.messages.create({
      model: ENHANCER_MODEL,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: [{ type: "text", text: ENHANCE_SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: context }],
    });
    if (response.stop_reason === "refusal") {
      throw new ConvexError("This idea can't be enhanced. Try rewording it.");
    }
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    if (!text) throw new ConvexError("Couldn't enhance the prompt. Try again.");
    return text.slice(0, MAX_PROMPT_LENGTH);
  },
});
