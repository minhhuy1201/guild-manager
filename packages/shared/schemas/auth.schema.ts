import { z } from "zod";

import { GuildRole } from "../enums/role.enum";
import { characterSchema } from "./character.schema";

/** Payload asking for a fresh token pair once the access token expired. */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Thiếu refresh token."),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/** Payload trading a one-time code (issued by the API at the end of the OAuth callback) for a JWT pair. */
export const discordExchangeSchema = z.object({
  code: z.string().min(1, "Thiếu mã đăng nhập."),
});

export type DiscordExchangeInput = z.infer<typeof discordExchangeSchema>;

/** Session info the API returns — never contains a Discord token. */
export const sessionUserSchema = z.object({
  discordId: z.string(),
  discordUsername: z.string().nullable(),
  /**
   * Discord avatar hash from the last login — the hash only, not a full URL. The web
   * app builds the CDN URL from it and `discordId`; null means unread or a default avatar.
   */
  discordAvatar: z.string().nullable(),
  role: z.enum(GuildRole),
  /** Character bound to this account; null only for a rescue admin */
  character: characterSchema.nullable(),
});

/** Token pair issued after a successful code exchange or refresh. */
export const authTokensSchema = z.object({
  /** Used for authenticated requests (1 day) */
  accessToken: z.string(),
  /** Used to request a new token pair (1 week) */
  refreshToken: z.string(),
  user: sessionUserSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export type AuthTokens = z.infer<typeof authTokensSchema>;
