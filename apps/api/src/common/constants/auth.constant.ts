/**
 * JWT constants and types shared by the guards (`common/`) and the auth module (`modules/auth`).
 * They live in `common/` because guards may not import from `modules/`.
 */
import type { GuildRole } from '@guild/shared/enums';

/**
 * Guild role. The real definition is in `@guild/shared/enums` because the value crosses the network
 * (`/auth/me`, JWT payload); re-exported here so guards need not know the package path.
 */
export { GuildRole } from '@guild/shared/enums';

/**
 * Token type, written into the payload so one type cannot stand in for another.
 * `oauthState` is a short-lived token carried in the OAuth `state` parameter — not a session.
 */
export const TOKEN_TYPE = {
  access: 'access',
  refresh: 'refresh',
  oauthState: 'oauth_state',
} as const;

export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/** What is signed into an access/refresh token. */
export interface JwtPayload {
  /** Discord ID of the signed-in user — the key back to a Character */
  sub: string;
  /** Guild role at the time the token was issued */
  role: GuildRole;
  /** Whether this is an access or a refresh token */
  type: TokenType;
}
