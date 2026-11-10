# AIUGC

AI UGC video generator for iOS, Android and web. Expo SDK 58 + Expo Router, Convex (database, storage, server logic), Clerk (auth), RevenueCat (credits as a virtual currency, paywalls), fal.ai (images and video), Claude (prompt enhancement).

## How a generation works

1. `generations.create` (mutation) validates settings against `convex/lib/models.ts`, which is the only source of prices, then stores the generation as `charging`.
2. `billing.charge` spends the credits in RevenueCat in one atomic call (`Idempotency-Key: spend:<generationId>`). RevenueCat rejects the spend and takes nothing if the balance is short.
3. `pipeline.prepare` asks Claude for a first-frame prompt and a video prompt, then fans out one job per variation.
4. `falNode.startVideo` composes a 9:16 first frame with Nano Banana (using avatar and product photos as references), then submits image-to-video to the fal queue with a signed webhook.
5. `/fal/webhook` verifies fal's Ed25519 signature, then `falNode.finalizeVideo` copies the mp4 into Convex storage.
6. A failed variation is refunded exactly once (`refund:<videoId>`). `watchdog.sweep` runs every minute and retries stuck steps, polls for lost webhooks and times out stuck renders.

## Run it

```bash
npm install
npx convex dev          # backend (keep running)
npx expo start          # Metro for iOS, Android and web
npx expo run:ios        # first time, or after native changes
npx expo run:android
```

## Configuration

Convex environment (`npx convex env set NAME value`):

| Name | Purpose |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk Frontend API URL |
| `FAL_KEY` | fal.ai API key |
| `ANTHROPIC_API_KEY` | Claude API key |
| `REVENUECAT_SECRET_KEY` | RevenueCat v2 secret key (customer purchases + configuration read/write) |
| `REVENUECAT_PROJECT_ID` | RevenueCat project id |
| `REVENUECAT_WEBHOOK_SECRET` | Shared secret for `/revenuecat/webhook` |

App (`.env.local`): `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_REVENUECAT_TEST_KEY` (dev builds only), `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.

## Shipping (EAS)

Every push to `main` runs `.eas/workflows/deploy-to-production.yml`:

1. Fingerprint the native layer (native packages, config plugins, `app.json`, `patches/`).
2. If a production build with that fingerprint exists, publish an **EAS Update** to the `production` branch (over the air, no store review).
3. Otherwise **build** and **submit** to App Store Connect (TestFlight) and the Google Play internal track.

Skip a run with `[eas skip]` in the commit message. Run it manually with `eas workflow:run .eas/workflows/deploy-to-production.yml`.

Build profiles (`eas.json`): `development` (dev client, simulator), `preview` (internal), `production` (stores). Each maps to the update channel and EAS environment of the same name; app config comes from EAS environment variables, not `.env.local`.

One-time setup before the first automated release:

- Link the GitHub repo in the Expo dashboard (project → Settings → GitHub).
- iOS: create the app in App Store Connect (bundle `app.notjust.aiugc`), then run `eas build -p ios --profile production` once interactively to create signing credentials, and `eas credentials -p ios` to add an App Store Connect API key for submissions.
- Android: run `eas build -p android --profile production` once to create the keystore, create the app in Google Play Console, upload that first `.aab` by hand (Google requires it), then add a Google service account key with `eas credentials -p android`.

## Test account (development instance only)

Clerk test user: `aiugc+clerk_test@example.com`. Addresses containing `+clerk_test` never receive email; enter the fixed verification code `424242` on the code screen. RevenueCat Test Store purchases work with this account in development builds.

## Seed the catalog

```bash
npx convex run seed:avatars           # 4 public AI creators (~$0.25 on fal)
npx convex run seed:templates         # 2 inspiration videos (~$2.50 on fal)
npx convex run seed:status            # wait until both are "completed"
npx convex run seed:publishTemplates
```
