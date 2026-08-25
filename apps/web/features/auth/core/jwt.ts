/**
 * Verify the HS256 JWTs the backend (apps/api) signs, using Web Crypto.
 * This file is in `core/`, so it uses no Node-specific API and no `next/headers`; it runs both in the
 * proxy (Edge runtime) and in server actions.
 */
import type { GuildRole } from "@guild/shared/enums";

/** The only accepted algorithm — the same default @nestjs/jwt uses. */
const EXPECTED_ALG = "HS256";

/** The payload the backend signs into access/refresh tokens. */
export interface JwtPayload {
  /** Discord ID of the signed-in user */
  sub: string;
  /** Guild role */
  role: GuildRole;
  /** Whether this is an "access" or a "refresh" token */
  type: string;
  /** Expiry (epoch seconds) */
  exp: number;
}

const encoder = new TextEncoder();

/**
 * Decode a base64url string into bytes.
 * @param value - base64url string (unpadded)
 * @returns The original bytes
 */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build an HMAC-SHA256 CryptoKey from the secret.
 * @param secret - The secret string (AUTH_SECRET, identical to apps/api's)
 * @returns The CryptoKey used to verify signatures
 */
function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Verify a JWT's signature and expiry.
 * @param token - Token from the cookie (may be undefined)
 * @param secret - The secret the backend signs with
 * @returns The payload when the token is valid and unexpired, otherwise null
 */
export async function verifyJwt(
  token: string | undefined,
  secret: string
): Promise<JwtPayload | null> {
  if (!token) return null;

  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  try {
    const { alg } = JSON.parse(
      new TextDecoder().decode(fromBase64Url(header))
    ) as { alg?: string };
    if (alg !== EXPECTED_ALG) return null;

    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(`${header}.${body}`)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as JwtPayload;

    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 <= Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
