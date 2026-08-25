/**
 * Sign HS256 JWTs with Web Crypto — a test-only counterpart of what the backend does in `apps/api`.
 * It sits beside the `core/` tests because both the JWT tests and the proxy tests need real tokens.
 * It has no `.test.ts` suffix, so Vitest does not collect it as a suite.
 */

import { GuildRole } from "@guild/shared/enums";

const encoder = new TextEncoder();

/**
 * Encode a string or bytes as unpadded base64url.
 * @param value - UTF-8 string or raw bytes to encode
 * @returns The base64url string
 */
export function toBase64Url(value: string | Uint8Array): string {
  const binary =
    typeof value === "string"
      ? String.fromCharCode(...encoder.encode(value))
      : String.fromCharCode(...value);

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** An expiry `seconds` from now (epoch seconds; negative produces an expired token). */
export function expiresIn(seconds: number): number {
  return Math.floor(Date.now() / 1000) + seconds;
}

/** Default payload of a valid admin access token. */
export const DEFAULT_PAYLOAD: Record<string, unknown> = {
  sub: "999888777666555444",
  role: GuildRole.ADMIN,
  type: "access",
};

/** Payload of a valid member access token. */
export const MEMBER_PAYLOAD: Record<string, unknown> = {
  sub: "123456789012345678",
  role: GuildRole.MEMBER,
  type: "access",
};

/**
 * Build a JWT with an arbitrary header and payload; the signature is always computed correctly from
 * `secret`, even when the header declares a different `alg` — so algorithm-confusion attacks are testable.
 * @param options - Header, payload and secret to use
 * @returns The three-part token
 */
export async function signToken({
  header = { alg: "HS256", typ: "JWT" },
  payload = { ...DEFAULT_PAYLOAD, exp: expiresIn(3600) },
  secret,
}: {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  secret: string;
}): Promise<string> {
  const data = `${toBase64Url(JSON.stringify(header))}.${toBase64Url(
    JSON.stringify(payload)
  )}`;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));

  return `${data}.${toBase64Url(new Uint8Array(signature))}`;
}
