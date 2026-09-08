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
 * Imported keys, one per secret. `verifyJwt` runs on every page request, and AUTH_SECRET is the same
 * string for the life of the process, so the import is pure repeated work.
 * Keyed by secret rather than held in a single slot: the secret is a parameter, and a cache that
 * ignored it would hand one secret another's key.
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

/**
 * Build an HMAC-SHA256 CryptoKey from the secret, reusing the one built earlier for that secret.
 * The cache holds the promise, not the resolved key, so two concurrent verifies await one import.
 * @param secret - The secret string (AUTH_SECRET, identical to apps/api's)
 * @returns The CryptoKey used to verify signatures
 */
function importKey(secret: string): Promise<CryptoKey> {
  const cached = keyCache.get(secret);
  if (cached) return cached;

  const pending = crypto.subtle
    .importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    // A rejected import must not stay cached: keeping it would turn one transient failure into
    // every later verify failing until the process dies. Rethrown, so the caller still sees it.
    .catch((error: unknown) => {
      keyCache.delete(secret);
      throw error;
    });

  keyCache.set(secret, pending);

  return pending;
}

/** Why a token was not accepted, or the payload when it was. */
export type JwtResult =
  /** Signature checks out and the token is still in date */
  | { status: "valid"; payload: JwtPayload }
  /** Signature checks out; the clock has passed `exp` */
  | { status: "expired" }
  /** Missing, malformed, wrong algorithm, or signed with another secret */
  | { status: "invalid" };

/** The failure shared by every branch that cannot even get to a signature check. */
const INVALID: JwtResult = { status: "invalid" };

/**
 * Verify a JWT and say **why** it was refused.
 *
 * `verifyJwt` collapses every refusal into null, which is right for "may this request proceed" and
 * wrong for "what should the person be told": a token signed with another secret and a token that
 * simply ran out are the same answer there, so an `AUTH_SECRET` mismatch between the two apps reads
 * exactly like an ordinary expiry - a redirect to the login page, forever, with no explanation.
 *
 * @param token - Token from the cookie (may be undefined)
 * @param secret - The secret the backend signs with
 * @returns The payload, or the reason it was refused
 */
export async function readJwt(
  token: string | undefined,
  secret: string
): Promise<JwtResult> {
  if (!token) return INVALID;

  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return INVALID;

  try {
    const { alg } = JSON.parse(
      new TextDecoder().decode(fromBase64Url(header))
    ) as { alg?: string };
    if (alg !== EXPECTED_ALG) return INVALID;

    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder.encode(`${header}.${body}`)
    );
    if (!valid) return INVALID;

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(body))
    ) as JwtPayload;

    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return INVALID;
    }
    // Past `exp` the signature was still ours, so this is a session that ran out, not a broken one.
    if (payload.exp * 1000 <= Date.now()) return { status: "expired" };

    return { status: "valid", payload };
  } catch {
    return INVALID;
  }
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
  const result = await readJwt(token, secret);

  return result.status === "valid" ? result.payload : null;
}
