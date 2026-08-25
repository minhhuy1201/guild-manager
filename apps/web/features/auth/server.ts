import "server-only";

/**
 * The **server** entry point of the auth feature: everything touching the session cookies.
 *
 * Split from `./index.ts` because the functions below use `next/headers` — only Server Components,
 * Server Actions and Route Handlers may call them. The `import "server-only"` at the top turns an
 * accidental import from a Client Component into a clearly named build error, instead of the
 * hard-to-trace "next/headers in the Pages Router" one.
 */
export { fetchMe } from "./api/me";
export {
  clearSession,
  createSession,
  getAccessToken,
  getSession,
} from "./api/session";
export type { SessionUser } from "./api/session";
