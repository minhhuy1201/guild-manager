/**
 * Interface of the "runs on the Edge runtime" group: no `next/headers`, no `server-only`.
 * `proxy.ts` is the main consumer — it runs on the Edge and so cannot load `api/session.ts`, which is
 * why the auth module's seam is split by runtime rather than by public/private.
 */
export { verifyJwt, type JwtPayload } from "./jwt";
export { decideAccess, type AccessDecision } from "./access";
export { exchangeRequest, refreshRequest } from "./auth-api";
export {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from "./cookie-names";
