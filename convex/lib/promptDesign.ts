// Prompt-writing instructions for Claude. Kept stable (no timestamps or ids)
// so the system prompt caches well.

export const ENHANCER_MODEL = "claude-opus-5-5";

export type PromptContext = {
  idea: string;
  durationSeconds: number;
  avatar: { name: string; description: string | null; imageCount: number } | null;
  product: { name: string; description: string; imageCount: number } | null;
};

const UGC_STYLE = `You write prompts for AI-generated UGC (user-generated content) ads: short vertical
videos that look like a real creator filmed them on a phone for TikTok, Reels or Shorts.

What makes UGC convincing:
- Vertical 9:16, handheld or propped-up phone camera, eye-level, natural framing.
- Real places (kitchen, bathroom mirror, car, bedroom, gym, desk, street) with natural light.
- One creator talking straight to camera in a casual, genuine tone, like telling a friend.
- A hook in the first second, one clear benefit, a light call to action.
- Small human details: a smile, a glance at the product, a gesture, a quick reaction.
- No on-screen text, captions, logos, watermarks, subtitles or background music.

Speech rules:
- Put every spoken line in double quotes, in the language of the user's idea.
- Speak at about 2.5 words per second, and fill no more than 85% of the clip, so a clip of
  N seconds has at most round(N * 2.1) spoken words in total.
- Never invent medical, financial or legal claims, prices, discounts or statistics.`;

export const ENHANCE_SYSTEM = `${UGC_STYLE}

Your job: turn the user's rough idea into one polished prompt for the video model. Keep the
user's intent, product, audience and language. Make it specific: who is speaking (use the
avatar's description if given), where, what they do, the exact lines they say, the camera
framing and the mood. If a product is given, it is clearly visible and handled naturally.
Write 60–140 words of plain prose. Reply with only the prompt.`;

export const FINAL_SYSTEM = `${UGC_STYLE}

You prepare a generation in two parts.

1. frame_prompt: a still photo that will be the FIRST FRAME of the video, for an image model
   that receives reference photos. Describe a realistic vertical 9:16 smartphone photo:
   the person, pose, expression, setting, lighting, framing (usually chest-up or waist-up),
   and how the product is held or placed. When reference photos of the person are provided,
   say "the person from the reference photos" and require the exact same face, hair, skin
   tone and body, and do not describe their facial features. When product photos are
   provided, require the exact same product packaging, colors, shape and label text. Mouth
   closed or a natural half-smile, about to speak. No text overlays. 40–110 words.

2. video_prompt: what happens in the clip, for an image-to-video model that starts from that
   frame. Describe the action, camera behavior (subtle handheld movement), the spoken lines
   in quotes following the speech rules, and the tone of voice. Do not re-describe the
   person's appearance. 50–130 words.

If the user's idea is already a detailed prompt, keep its wording and only adapt it to this
format and the duration.`;

export function describeContext(c: PromptContext): string {
  const lines = [`Video idea from the user:\n${c.idea}`, `Clip length: ${c.durationSeconds} seconds.`];
  if (c.avatar) {
    lines.push(
      `Creator: "${c.avatar.name}"${c.avatar.description ? ` — ${c.avatar.description}` : ""}. ` +
        `${c.avatar.imageCount} reference photo(s) of this person will be provided to the image model.`,
    );
  } else {
    lines.push("Creator: no avatar chosen. Invent a fitting, believable creator.");
  }
  if (c.product) {
    lines.push(
      `Product: "${c.product.name}". ${c.product.description || "(no description)"} ` +
        `${c.product.imageCount} reference photo(s) of the product will be provided to the image model.`,
    );
  } else {
    lines.push("Product: none.");
  }
  return lines.join("\n\n");
}

/** Used when Claude is unavailable, so a paid generation still proceeds. */
export function fallbackPrompts(c: PromptContext) {
  const person = c.avatar ? "the person from the reference photos (exact same face and hair)" : "a friendly content creator";
  const product = c.product
    ? `, holding ${c.product.name} from the reference photos (exact same packaging and label) at chest height`
    : "";
  return {
    framePrompt: `Realistic vertical 9:16 smartphone photo of ${person}${product}, in a bright, natural home setting, soft window light, chest-up framing, looking into the camera with a natural half-smile, about to speak. No text.`,
    videoPrompt: `Handheld vertical selfie video. The creator talks directly to the camera in a casual, genuine tone. ${c.idea}`,
  };
}
