// Catalog seeding. Run from the CLI, e.g.:
//   npx convex run seed:avatars
//   npx convex run seed:templates
//   npx convex run seed:status
//   npx convex run seed:publishTemplates
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { SYSTEM_USER_ID } from "./lib/auth";

const PHOTO_STYLE =
  "Candid, photorealistic smartphone photo, natural skin texture, soft natural light, " +
  "shallow depth of field, looking at the camera with a warm, genuine expression, " +
  "upper body framing, no text, no watermark.";

export const CATALOG_AVATARS = [
  {
    name: "Maya",
    description: "Late-20s woman, warm and upbeat lifestyle creator, curly dark hair, casual knit sweater.",
    prompt: `A woman in her late 20s with curly dark shoulder-length hair and light brown skin, wearing a cream knit sweater, sitting in a bright, cozy living room with plants. ${PHOTO_STYLE}`,
  },
  {
    name: "Jordan",
    description: "Early-30s man, friendly tech and fitness reviewer, short beard, athletic.",
    prompt: `A man in his early 30s with a short neat beard and short black hair, athletic build, wearing a plain heather-grey t-shirt, standing in a modern apartment kitchen in daylight. ${PHOTO_STYLE}`,
  },
  {
    name: "Sofia",
    description: "Mid-20s woman, skincare and beauty creator, long blonde hair, minimal makeup.",
    prompt: `A woman in her mid 20s with long straight blonde hair and fair skin, minimal natural makeup, wearing a white ribbed tank top, in a clean bright bathroom with a mirror and soft window light. ${PHOTO_STYLE}`,
  },
  {
    name: "Dev",
    description: "Late-30s man, relaxed home and food creator, glasses, denim shirt.",
    prompt: `A man in his late 30s of South Asian descent with black-rimmed glasses and short wavy hair, wearing a light denim shirt, standing in a warm, lived-in home kitchen with wooden shelves. ${PHOTO_STYLE}`,
  },
];

export const CATALOG_TEMPLATES = [
  {
    key: "morning-coffee",
    title: "Morning ritual review",
    description: "Cozy at-home testimonial with a strong hook.",
    avatar: "Maya",
    prompt:
      "Maya films herself in her sunny living room holding a mug of coffee. She leans toward the camera like she's sharing a secret: \"Okay, this is the only thing getting me out of bed right now.\" She takes a sip, smiles, and says: \"Smooth, not bitter, and it's ready in a minute. You need this.\"",
    modelId: "veo31-fast",
    resolution: "720p",
    duration: 8,
    order: 1,
  },
  {
    key: "gym-bag",
    title: "Gym bag essentials",
    description: "Energetic product showcase in a real-life setting.",
    avatar: "Jordan",
    prompt:
      "Jordan in his kitchen after a workout, phone propped on the counter. He grins at the camera: \"Three things I never leave the house without.\" He taps the counter as if counting, then says: \"Number one changed my recovery. Seriously, try it.\"",
    modelId: "veo31-fast",
    resolution: "720p",
    duration: 8,
    order: 2,
  },
];

export const publicAvatarByName = internalQuery({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const rows = await ctx.db
      .query("avatars")
      .withIndex("by_owner", (q) => q.eq("ownerId", undefined))
      .collect();
    return rows.find((a) => a.name === name)?._id ?? null;
  },
});

/** Generates the 4 catalog avatars (skips any that already exist). ~$0.25 on fal. */
export const avatars = internalAction({
  args: {},
  handler: async (ctx) => {
    const created: string[] = [];
    for (const a of CATALOG_AVATARS) {
      const existing = await ctx.runQuery(internal.seed.publicAvatarByName, { name: a.name });
      if (existing) continue;
      const imageId = await ctx.runAction(internal.falNode.generatePortrait, { prompt: a.prompt });
      await ctx.runMutation(internal.avatars.insertPublic, {
        name: a.name,
        description: a.description,
        imageId,
      });
      created.push(a.name);
    }
    return { created };
  },
});

/** Starts unbilled system generations for the catalog videos. ~$1.25 each on fal. */
export const templates = internalAction({
  args: { only: v.optional(v.string()) },
  handler: async (ctx, { only }) => {
    const started: { key: string; generationId: Id<"generations"> }[] = [];
    for (const t of CATALOG_TEMPLATES) {
      if (only && t.key !== only) continue;
      const avatarId = await ctx.runQuery(internal.seed.publicAvatarByName, { name: t.avatar });
      if (!avatarId) throw new Error(`Seed avatars first (missing ${t.avatar})`);
      const generationId = await ctx.runMutation(internal.generations.createUnbilled, {
        prompt: t.prompt,
        avatarId,
        modelId: t.modelId,
        resolution: t.resolution,
        duration: t.duration,
        variations: 1,
      });
      started.push({ key: t.key, generationId });
    }
    return started;
  },
});

/** Shows the state of every system video. */
export const status = internalQuery({
  args: {},
  handler: async (ctx) => {
    const vids = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", SYSTEM_USER_ID))
      .collect();
    return Promise.all(
      vids.map(async (vid) => {
        const gen = await ctx.db.get(vid.generationId);
        return {
          videoId: vid._id,
          status: vid.status,
          error: vid.error ?? null,
          prompt: gen?.prompt.slice(0, 60),
          hasTemplate: !!(await ctx.db
            .query("templates")
            .filter((q) => q.eq(q.field("videoFileId"), vid.videoFileId ?? null))
            .first()),
        };
      }),
    );
  },
});

/** Publishes each completed seed video as a template (matched by prompt). */
export const publishTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const vids = await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", SYSTEM_USER_ID))
      .collect();
    const published: string[] = [];
    for (const t of CATALOG_TEMPLATES) {
      const already = await ctx.db
        .query("templates")
        .filter((q) => q.eq(q.field("title"), t.title))
        .first();
      if (already) continue;
      for (const vid of vids) {
        if (vid.status !== "completed" || !vid.videoFileId || !vid.posterId) continue;
        const gen = await ctx.db.get(vid.generationId);
        if (gen?.prompt !== t.prompt) continue;
        await ctx.db.insert("templates", {
          title: t.title,
          description: t.description,
          prompt: t.prompt,
          avatarId: gen.avatarId,
          modelId: gen.modelId,
          resolution: gen.resolution,
          duration: gen.duration,
          posterId: vid.posterId,
          videoFileId: vid.videoFileId,
          order: t.order,
        });
        published.push(t.title);
        break;
      }
    }
    return { published };
  },
});
