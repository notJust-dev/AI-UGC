import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Prompt enhancement is free to call, so keep it tight.
  enhance: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },
  upload: { kind: "token bucket", rate: 60, period: HOUR, capacity: 12 },
  generate: { kind: "token bucket", rate: 30, period: HOUR, capacity: 4 },
  creditSync: { kind: "token bucket", rate: 30, period: MINUTE, capacity: 5 },
});

/** Max videos a single user may have in flight at once. */
export const MAX_IN_FLIGHT_VIDEOS = 8;
