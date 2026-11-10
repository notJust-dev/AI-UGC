import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REFERENCE_IMAGES = 4;

/** Validates uploaded reference images: 1–4, images only, ≤ 10 MB each. */
export async function validateImageUploads(
  ctx: MutationCtx,
  ids: Id<"_storage">[],
): Promise<void> {
  if (ids.length < 1 || ids.length > MAX_REFERENCE_IMAGES) {
    throw new ConvexError(`Add 1 to ${MAX_REFERENCE_IMAGES} photos`);
  }
  if (new Set(ids).size !== ids.length) throw new ConvexError("Duplicate photo");
  for (const id of ids) {
    const meta = await ctx.db.system.get(id);
    if (!meta) throw new ConvexError("Photo upload not found");
    if (!meta.contentType?.startsWith("image/")) {
      throw new ConvexError("Only images can be used");
    }
    if (meta.size > MAX_IMAGE_BYTES) throw new ConvexError("Photo is too large");
  }
}

export async function urlOf(
  ctx: QueryCtx,
  id: Id<"_storage"> | undefined,
): Promise<string | null> {
  return id ? await ctx.storage.getUrl(id) : null;
}

export async function urlsOf(ctx: QueryCtx, ids: Id<"_storage">[]): Promise<string[]> {
  const urls = await Promise.all(ids.map((id) => ctx.storage.getUrl(id)));
  return urls.filter((u): u is string => !!u);
}
