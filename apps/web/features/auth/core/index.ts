/**
 * Interface của nhóm "chạy được ở Edge runtime": không import `next/headers`,
 * không `server-only`. `proxy.ts` là người dùng chính — nó chạy ở Edge nên không
 * nạp được `api/session.ts`, vì vậy seam của module auth chia theo runtime chứ
 * không theo public/private.
 */
export { verifyJwt, type JwtPayload } from "./jwt";
export { refreshRequest, loginRequest } from "./auth-api";
export {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_MAX_AGE,
  AUTH_COOKIE_OPTIONS,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_MAX_AGE,
} from "./cookie-names";
