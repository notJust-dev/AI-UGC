import * as ed from "@noble/ed25519";

export const FAL_JWKS_URL = "https://rest.fal.ai/.well-known/jwks.json";
const MAX_SKEW_SECONDS = 300;

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]*$/i.test(hex) || hex.length % 2) throw new Error("bad hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function fetchFalJwks(): Promise<string[]> {
  const res = await fetch(FAL_JWKS_URL);
  if (!res.ok) throw new Error(`jwks ${res.status}`);
  const json = (await res.json()) as { keys?: { x?: string }[] };
  return (json.keys ?? []).map((k) => k.x).filter((x): x is string => !!x);
}

/**
 * fal signs `requestId \n userId \n timestamp \n sha256hex(rawBody)` with ED25519.
 * Returns true only for a valid, fresh signature from one of fal's published keys.
 */
export async function verifyFalWebhook(
  headers: Headers,
  rawBody: Uint8Array,
  publicKeysB64Url: string[],
): Promise<boolean> {
  const requestId = headers.get("x-fal-webhook-request-id");
  const userId = headers.get("x-fal-webhook-user-id");
  const timestamp = headers.get("x-fal-webhook-timestamp");
  const signatureHex = headers.get("x-fal-webhook-signature");
  if (!requestId || !userId || !timestamp || !signatureHex) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) return false;

  let signature: Uint8Array;
  try {
    signature = hexToBytes(signatureHex);
  } catch {
    return false;
  }
  const message = new TextEncoder().encode(
    [requestId, userId, timestamp, await sha256Hex(rawBody)].join("\n"),
  );
  for (const key of publicKeysB64Url) {
    try {
      if (await ed.verifyAsync(signature, message, base64UrlToBytes(key))) return true;
    } catch {
      // wrong key length / malformed key: try the next one
    }
  }
  return false;
}
