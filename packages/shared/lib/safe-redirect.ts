/** Default page after login, and the safe fallback when a redirect is invalid. */
export const DEFAULT_REDIRECT = '/';

/**
 * Sanitise a client-supplied `redirect` parameter.
 *
 * Only single-slash relative paths are accepted. `//host` is rejected because browsers read it as a
 * protocol-relative URL - accepting it opens an open redirect in the middle of the login flow.
 *
 * It lives here rather than in either app because both ends of the login flow apply it to the same
 * value: the API sanitises what it puts in the OAuth state, and the web app sanitises what it reads
 * off the query string before sending a signed-in visitor on. Two copies would drift, and the half
 * that drifted would be the one with the open redirect.
 * @param value - Raw `redirect` value, undefined when absent
 * @returns A safe path to redirect to after login
 */
export function safeRedirect(value: string | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//'))
    return DEFAULT_REDIRECT;

  return value;
}
