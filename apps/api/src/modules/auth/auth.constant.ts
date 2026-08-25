/**
 * Lifetimes of the login tokens.
 * Constants rather than env variables because nothing needs them to differ per environment.
 */

/** Access token lifetime — used for every authenticated request. */
export const ACCESS_TOKEN_TTL = '1d';

/** Refresh token lifetime — decides how long until the user must sign in again. */
export const REFRESH_TOKEN_TTL = '7d';

/** Lifetime of the OAuth `state` token — only needs to cover one round of clicking "Authorize". */
export const OAUTH_STATE_TTL = '5m';

/** Lifetime of the JWT exchange code (milliseconds) — enough for one redirect, no more. */
export const EXCHANGE_TTL_MS = 60_000;

/** Error codes sent to the web app on the query string; the web app maps them to Vietnamese text. */
export const AUTH_ERROR = {
  /** The user clicked Cancel on Discord's authorize screen */
  denied: 'tu-choi',
  /** The Discord ID matches no member and is not on the rescue list */
  notMember: 'khong-thuoc-bang',
  /** State malformed, expired, or of the wrong type */
  expired: 'phien-het-han',
  /** Discord was unreachable */
  upstream: 'discord-loi',
} as const;
