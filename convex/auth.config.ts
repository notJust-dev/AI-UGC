import type { AuthConfig } from "convex/server";

// Clerk issues a JWT (template "convex", aud = "convex") that Convex verifies.
// CLERK_JWT_ISSUER_DOMAIN is the Clerk Frontend API URL, set with `npx convex env set`.
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
