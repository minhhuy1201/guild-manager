import { ApiError } from "./api-client";

/** HTTP status the API answers when the access token is missing, expired or unreadable. */
const UNAUTHORIZED = 401;

/**
 * Whether a failed write failed because the session needs re-establishing.
 *
 * Only 401 qualifies. A 403 or a 409 fails again on the next press whatever happens to the cookies,
 * and treating those as "try again" would be a lie.
 * @param error - Value thrown by the write
 * @returns true when the session, not the request, is the problem
 */
export function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === UNAUTHORIZED;
}
