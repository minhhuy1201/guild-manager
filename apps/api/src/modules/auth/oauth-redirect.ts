/**
 * The rule itself lives in `@guild/shared/lib`: the web app applies it to the same `redirect` value
 * when it sends a signed-in visitor on from the login page, and a second copy here would be the one
 * that drifts. Re-exported so this module stays the auth module's one door onto redirect handling.
 */
export { safeRedirect } from '@guild/shared/lib';

/**
 * Build an absolute URL pointing back at the frontend.
 * @param origin - The configured WEB_ORIGIN
 * @param path - Relative path, starting with `/`
 * @param params - Extra query string parameters
 * @returns The full URL for the Location header
 */
export function webUrl(
  origin: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const url = new URL(path, origin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
