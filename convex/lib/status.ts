import type { Doc } from "../_generated/dataModel";

export type VideoStatus = Doc<"videos">["status"];

export function isTerminal(status: VideoStatus) {
  return status === "completed" || status === "failed";
}

/** Turns fal error payloads into copy a user can act on. */
export function friendlyFalError(raw: unknown): string {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
  if (/content_policy|model_moderated|safety|nsfw/i.test(text)) {
    return "This request was blocked by the model's safety filter. Try rewording the prompt or using different photos.";
  }
  if (/image_load_error|file_download_error|image_too_small|unsupported/i.test(text)) {
    return "One of the reference photos couldn't be used. Try a different photo.";
  }
  if (/timeout|generation_timeout/i.test(text)) {
    return "The model took too long. Your credits were refunded; please try again.";
  }
  return "Something went wrong while rendering. Your credits for this video were refunded.";
}
