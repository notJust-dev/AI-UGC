/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as avatars from "../avatars.js";
import type * as billing from "../billing.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as falNode from "../falNode.js";
import type * as files from "../files.js";
import type * as generations from "../generations.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_balance from "../lib/balance.js";
import type * as lib_falSignature from "../lib/falSignature.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_promptDesign from "../lib/promptDesign.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_status from "../lib/status.js";
import type * as lib_storage from "../lib/storage.js";
import type * as pipeline from "../pipeline.js";
import type * as products from "../products.js";
import type * as seed from "../seed.js";
import type * as templates from "../templates.js";
import type * as videos from "../videos.js";
import type * as watchdog from "../watchdog.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  avatars: typeof avatars;
  billing: typeof billing;
  credits: typeof credits;
  crons: typeof crons;
  falNode: typeof falNode;
  files: typeof files;
  generations: typeof generations;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/balance": typeof lib_balance;
  "lib/falSignature": typeof lib_falSignature;
  "lib/models": typeof lib_models;
  "lib/promptDesign": typeof lib_promptDesign;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/status": typeof lib_status;
  "lib/storage": typeof lib_storage;
  pipeline: typeof pipeline;
  products: typeof products;
  seed: typeof seed;
  templates: typeof templates;
  videos: typeof videos;
  watchdog: typeof watchdog;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
