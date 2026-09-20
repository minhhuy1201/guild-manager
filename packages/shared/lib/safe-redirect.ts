/**
 * Default page after login, and the safe fallback when a redirect is invalid.
 * Not exported: callers read it back through `safeRedirect`, never on its own.
 */
const DEFAULT_REDIRECT = '/';

/**
 * Characters a browser strips or normalises before resolving a URL, which is what lets them smuggle
 * an authority past a check that reads the string literally. Tab, newline and carriage return are
 * removed outright; a leading space is trimmed.
 */
const SMUGGLING_CHARS = /[\t\n\r\s]/;

/**
 * Sanitise a client-supplied `redirect` parameter.
 *
 * Only relative paths on this site are accepted, and the check is deliberately blunt: the path must
 * start with a single `/` whose next character opens neither an authority nor anything a browser
 * will turn into one.
 *
 * - `//host` is a protocol-relative URL.
 * - `/\host` is the same thing to every browser, which normalises the backslash to a slash before
 *   resolving. `new URL('/\evil.example', origin).href` is `https://evil.example/`, so a check that
 *   only looks for `//` waves it straight through.
 * - A value carrying a tab, newline or space is rejected rather than trimmed: browsers strip those
 *   while resolving, so `/\t/evil.example` would become an authority after the check had passed.
 *
 * It lives here rather than in either app because both ends of the login flow apply it to the same
 * value: the API sanitises what it puts in the OAuth state, and the web app sanitises what it reads
 * off the query string before sending a signed-in visitor on. Two copies would drift, and the half
 * that drifted would be the one with the open redirect.
 * @param value - Raw `redirect` value, undefined when absent
 * @returns A safe path to redirect to after login
 */
export function safeRedirect(value: string | undefined): string {
  if (!value?.startsWith('/')) return DEFAULT_REDIRECT;
  if (value[1] === '/' || value[1] === '\\') return DEFAULT_REDIRECT;
  if (SMUGGLING_CHARS.test(value)) return DEFAULT_REDIRECT;

  return value;
}
