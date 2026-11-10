// Video model + pricing registry.
// Runtime-neutral: imported by the app (display) and by Convex (the only source of truth for cost).
// Pricing basis: 1 credit ≈ $0.05 of provider cost (fal prices checked 2026-11-10).

export type ModelId = "veo31-fast" | "kling-v3-pro" | "veo31" | "seedance-25";

export type Resolution = "720p" | "1080p";

export type VideoModel = {
  id: ModelId;
  name: string;
  tagline: string;
  endpoint: string;
  durations: number[];
  defaultDuration: number;
  resolutions: Resolution[];
  /** Credits per second of output, per resolution. */
  creditsPerSecond: Record<Resolution, number>;
  buildInput: (args: {
    prompt: string;
    imageUrl: string;
    duration: number;
    resolution: Resolution;
  }) => Record<string, unknown>;
};

/** Credits charged per variation for the AI-composed first frame. */
export const FRAME_CREDITS = 1;
export const MAX_VARIATIONS = 4;
export const MAX_PROMPT_LENGTH = 2000;

export const VIDEO_MODELS: Record<ModelId, VideoModel> = {
  "veo31-fast": {
    id: "veo31-fast",
    name: "Veo 3.1 Fast",
    tagline: "Fast, natural speech. Best value.",
    endpoint: "fal-ai/veo3.1/fast/image-to-video",
    durations: [4, 6, 8],
    defaultDuration: 8,
    resolutions: ["720p", "1080p"],
    creditsPerSecond: { "720p": 3, "1080p": 3 },
    buildInput: ({ prompt, imageUrl, duration, resolution }) => ({
      prompt,
      image_url: imageUrl,
      aspect_ratio: "9:16",
      duration: `${duration}s`,
      resolution,
      generate_audio: true,
    }),
  },
  "kling-v3-pro": {
    id: "kling-v3-pro",
    name: "Kling 3 Pro",
    tagline: "Expressive motion, longer clips.",
    endpoint: "fal-ai/kling-video/v3/pro/image-to-video",
    durations: [5, 10],
    defaultDuration: 5,
    resolutions: ["1080p"],
    creditsPerSecond: { "720p": 4, "1080p": 4 },
    buildInput: ({ prompt, imageUrl, duration }) => ({
      prompt,
      start_image_url: imageUrl, // 9:16 comes from the first frame
      duration: String(duration),
      generate_audio: true,
    }),
  },
  veo31: {
    id: "veo31",
    name: "Veo 3.1",
    tagline: "Premium realism and lip sync.",
    endpoint: "fal-ai/veo3.1/image-to-video",
    durations: [4, 6, 8],
    defaultDuration: 8,
    resolutions: ["720p", "1080p"],
    creditsPerSecond: { "720p": 8, "1080p": 8 },
    buildInput: ({ prompt, imageUrl, duration, resolution }) => ({
      prompt,
      image_url: imageUrl,
      aspect_ratio: "9:16",
      duration: `${duration}s`,
      resolution,
      generate_audio: true,
    }),
  },
  "seedance-25": {
    id: "seedance-25",
    name: "Seedance 2.5",
    tagline: "Top quality, cinematic detail.",
    endpoint: "bytedance/seedance-2.5/us/image-to-video",
    durations: [5, 10],
    defaultDuration: 5,
    resolutions: ["720p", "1080p"],
    creditsPerSecond: { "720p": 10, "1080p": 24 },
    buildInput: ({ prompt, imageUrl, duration, resolution }) => ({
      prompt,
      image_url: imageUrl,
      duration: String(duration),
      resolution,
      generate_audio: true,
    }),
  },
};

export const DEFAULT_MODEL_ID: ModelId = "veo31-fast";
export const MODEL_LIST = Object.values(VIDEO_MODELS);

export function isModelId(id: string): id is ModelId {
  return id in VIDEO_MODELS;
}

/** Credits for a single variation. */
export function creditsPerVideo(
  model: VideoModel,
  duration: number,
  resolution: Resolution,
): number {
  return model.creditsPerSecond[resolution] * duration + FRAME_CREDITS;
}

export type GenerationSettings = {
  modelId: string;
  duration: number;
  resolution: string;
  variations: number;
};

/** Validates settings and returns the per-video and total cost, or an error message. */
export function quote(
  s: GenerationSettings,
):
  | { ok: true; model: VideoModel; resolution: Resolution; perVideo: number; total: number }
  | { ok: false; error: string } {
  if (!isModelId(s.modelId)) return { ok: false, error: "Unknown model" };
  const model = VIDEO_MODELS[s.modelId];
  if (!model.durations.includes(s.duration)) {
    return { ok: false, error: "Unsupported length for this model" };
  }
  const resolution = s.resolution as Resolution;
  if (!model.resolutions.includes(resolution)) {
    return { ok: false, error: "Unsupported quality for this model" };
  }
  if (!Number.isInteger(s.variations) || s.variations < 1 || s.variations > MAX_VARIATIONS) {
    return { ok: false, error: `Choose 1 to ${MAX_VARIATIONS} variations` };
  }
  const perVideo = creditsPerVideo(model, s.duration, resolution);
  return { ok: true, model, resolution, perVideo, total: perVideo * s.variations };
}

/** Queue/result URLs only use the owner/app part of the endpoint id. */
export function falAppId(endpoint: string): string {
  return endpoint.split("/").slice(0, 2).join("/");
}
