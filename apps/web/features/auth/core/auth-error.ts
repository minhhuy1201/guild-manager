/**
 * Codes the web app puts on `?error=` itself, for a redirect it decided on its own.
 *
 * Separate from `AUTH_ERROR` in `apps/api/src/modules/auth/auth.constant.ts` because no request ever
 * carries these - they are the answer to "why am I suddenly on a different page". They live in
 * `core/` rather than beside their sentences in `lib/login-error.ts` because `proxy.ts` sets one of
 * them and the proxy may only import from here; the other stays alongside it rather than in `lib/`,
 * because one set of codes split across two files is a set nobody can read at a glance.
 */
export const WEB_AUTH_ERROR = {
  /** The session cookie was not signed with this app's AUTH_SECRET, or the secret is missing */
  sessionInvalid: "phien-khong-hop-le",
  /** An admin-only page was opened by someone who is not (or is no longer) an admin */
  adminOnly: "khong-du-quyen",
} as const;
