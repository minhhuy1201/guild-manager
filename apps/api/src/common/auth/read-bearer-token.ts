import type { JwtPayload, TokenType } from '../constants/auth.constant';

/** Authorization header prefix per the Bearer scheme, case-sensitive like `startsWith`. */
const BEARER_PREFIX = 'Bearer ';

/** Verifies a JWT's signature and expiry. Allowed to throw — `readToken` is the only catcher. */
export type VerifyToken = (token: string) => Promise<JwtPayload>;

/**
 * Verify a token and check its type.
 *
 * Every invalid shape collapses to one value: malformed, wrong signature, expired, or correctly
 * signed but of the wrong type (a refresh token sent to an access route) — all yield `null`. The
 * caller decides whether `null` means "reject" or "anonymous visitor".
 * @param token - Bare token, no prefix
 * @param verify - JWT verify function; allowed to throw
 * @param expectedType - Token type that must match
 * @returns The verified payload of the expected type, or null
 */
export async function readToken(
  token: string,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null> {
  const payload = await verify(token).catch(() => null);

  return payload?.type === expectedType ? payload : null;
}

/**
 * Read and verify the token in the Authorization header. A missing header or wrong scheme also
 * yields `null`, the same path as a malformed token.
 * @param header - Authorization header value, undefined when absent
 * @param verify - JWT verify function; allowed to throw
 * @param expectedType - Token type that must match
 * @returns The verified payload of the expected type, or null
 */
export async function readBearerToken(
  header: string | undefined,
  verify: VerifyToken,
  expectedType: TokenType,
): Promise<JwtPayload | null> {
  if (!header?.startsWith(BEARER_PREFIX)) return null;

  return readToken(header.slice(BEARER_PREFIX.length), verify, expectedType);
}
