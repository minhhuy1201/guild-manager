/** Default page after login, and the safe fallback when a redirect is invalid. */
const DEFAULT_REDIRECT = '/';

/**
 * Sanitise the client-supplied `redirect` parameter.
 *
 * Only single-slash relative paths are accepted. `//host` is rejected because browsers read it as a
 * protocol-relative URL — accepting it opens an open redirect in the middle of the login flow.
 * @param value - Raw `redirect` value, undefined when absent
 * @returns A safe path to redirect to after login
 */
export function safeRedirect(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//'))
    return DEFAULT_REDIRECT;

  return value;
}

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
