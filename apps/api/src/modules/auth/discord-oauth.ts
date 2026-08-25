/** Discord's OAuth2 endpoints — constants, not per-environment config. */
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const PROFILE_URL = 'https://discord.com/api/users/@me';

/**
 * Only `identify` is requested: membership is decided by the Character table, not by Discord.
 * Asking for more scopes is asking for data we never use.
 */
const SCOPE = 'identify';

/** Discord Application config, read from environment variables. */
export interface DiscordConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** The part of a Discord profile the system actually uses. */
export interface DiscordProfile {
  /** Snowflake — the key back to a Character */
  id: string;
  /** Display name, used only so an admin can confirm the right person was assigned */
  username: string;
  /**
   * Avatar hash — the hash only, not a URL. null when the user keeps the default avatar.
   * A hash rather than a URL because the CDN URL format is Discord's business.
   */
  avatar: string | null;
}

/**
 * Build the URL sending the user to Discord's authorize page.
 * @param config - Discord Application config
 * @param state - Short-lived state token, returned verbatim by Discord in the callback
 * @returns The absolute redirect URL
 */
export function buildAuthorizeUrl(
  config: DiscordConfig,
  state: string,
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);

  return url.toString();
}

/**
 * Trade `code` for a Discord access token, then read the user's profile.
 *
 * That access token is **never stored**: it serves only the `/users/@me` call right below. A future
 * bot uses its own bot token, so keeping the user token would just be one more thing to protect.
 * @param config - Discord Application config
 * @param code - Authorization code Discord sent with the callback
 * @returns The minimal Discord profile
 * @throws Error when Discord refuses the code exchange or the profile read
 */
export async function exchangeCodeForProfile(
  config: DiscordConfig,
  code: string,
): Promise<DiscordProfile> {
  const tokenResponse = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Discord từ chối đổi code (${tokenResponse.status}).`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as {
    access_token?: string;
  };
  if (!accessToken) throw new Error('Discord không trả access token.');

  const profileResponse = await fetch(PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error(
      `Không đọc được hồ sơ Discord (${profileResponse.status}).`,
    );
  }

  const profile = (await profileResponse.json()) as {
    id?: string;
    username?: string;
    avatar?: string | null;
  };
  if (!profile.id || !profile.username) {
    throw new Error('Hồ sơ Discord thiếu id hoặc username.');
  }

  // `avatar` may be absent: an account on the default picture has no hash at all.
  return {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar ?? null,
  };
}
