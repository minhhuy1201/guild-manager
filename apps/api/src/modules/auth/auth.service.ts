import { randomBytes } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  sessionUserSchema,
  type AuthTokens,
  type DiscordExchangeInput,
  type RefreshTokenInput,
  type SessionUser,
} from '@guild/shared/schemas';

import { Clock, TOKEN_TYPE, readToken, type JwtPayload } from '../../common';
import { verifyResponse, type AppConfigService } from '../../config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  CharactersService,
  toCharacter,
} from '../characters/characters.public';
import { isRescueAdmin, resolveGuildRole } from './actor-identity';
import {
  ACCESS_TOKEN_TTL,
  AUTH_ERROR,
  EXCHANGE_TTL_MS,
  OAUTH_STATE_TTL,
  REFRESH_TOKEN_TTL,
} from './auth.constant';
import {
  buildAuthorizeUrl,
  exchangeCodeForProfile,
  type DiscordConfig,
} from './discord-oauth';
import { safeRedirect, webUrl } from './oauth-redirect';

/** One message for every unusable-session case — telling them apart is free information. */
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';

/** Path of the web app's login page. */
const LOGIN_PATH = '/dang-nhap';

/** Path of the web app's route handler that receives the exchange code. */
const CALLBACK_PATH = '/dang-nhap/discord';

/**
 * Discord OAuth2 authentication and JWT issuance.
 *
 * Identity comes from the `Character.discordId` column filled in by an admin: signing in is a lookup,
 * and no match means no entry at all. `DISCORD_ADMIN_IDS` is the single rescue path for when nobody
 * has been assigned an ID yet.
 */
@Injectable()
export class AuthService {
  constructor(
    // AppConfigService is only a type alias of ConfigService<Env>, so the token must be explicit.
    @Inject(ConfigService) private readonly config: AppConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Build the URL sending the user to Discord, carrying the signed state.
   * @param redirect - Path to return to after login
   * @returns The absolute Discord redirect URL
   */
  async authorizeUrl(redirect?: string): Promise<string> {
    const state = await this.jwt.signAsync(
      {
        sub: randomBytes(16).toString('base64url'),
        type: TOKEN_TYPE.oauthState,
        redirect: safeRedirect(redirect),
      },
      { expiresIn: OAUTH_STATE_TTL },
    );

    return buildAuthorizeUrl(this.discordConfig, state);
  }

  /**
   * Handle Discord's callback and say where the user should be redirected.
   *
   * Never throws: the browser is in the middle of a redirect chain, not inside a fetch call, so every
   * failure must become a URL carrying an error code.
   * @param query - Parameters Discord attached to the callback
   * @returns The absolute URL for the Location header
   */
  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<string> {
    if (query.error || !query.code || !query.state) {
      return this.errorUrl(AUTH_ERROR.denied, '/');
    }

    const state = await this.readState(query.state);
    if (!state) return this.errorUrl(AUTH_ERROR.expired, '/');

    const profile = await exchangeCodeForProfile(
      this.discordConfig,
      query.code,
    ).catch(() => null);
    if (!profile) return this.errorUrl(AUTH_ERROR.upstream, state.redirect);

    const member = await this.characters.findByDiscordId(profile.id);
    const adminIds = this.config.get('DISCORD_ADMIN_IDS', { infer: true });

    if (!member && !isRescueAdmin(profile.id, adminIds)) {
      return this.errorUrl(AUTH_ERROR.notMember, state.redirect);
    }

    if (member) {
      await this.characters.touchLogin(
        member.id,
        profile.username,
        profile.avatar,
        this.clock.now(),
      );
    }

    const code = await this.issueExchangeCode(profile.id);

    return webUrl(this.webOrigin, CALLBACK_PATH, {
      exchange: code,
      redirect: state.redirect,
    });
  }

  /**
   * Trade the one-time code for a JWT pair.
   * @param input - Code from the query string the API just redirected the web app to
   * @returns The token pair and session info
   * @throws UnauthorizedException when the code is wrong, already used, or older than 60 seconds
   */
  async exchange(input: DiscordExchangeInput): Promise<AuthTokens> {
    const now = this.clock.now();

    // Sweep expired rows right here rather than running a cron over a table of a few rows.
    await this.prisma.authExchange.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Consume the code with an atomic update: two requests on one code, only one wins.
    const consumed = await this.prisma.authExchange.updateMany({
      where: { id: input.code, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw new UnauthorizedException(SESSION_EXPIRED);

    const row = await this.prisma.authExchange.findUnique({
      where: { id: input.code },
    });
    if (!row) throw new UnauthorizedException(SESSION_EXPIRED);

    return this.issueTokens(row.discordId);
  }

  /**
   * Trade a valid refresh token for a new token pair.
   *
   * This is where removing someone from the system takes effect: once `discordId` is unlinked from
   * every character (and is not on the rescue list), the session ends.
   * @param input - The current refresh token
   * @returns The new token pair and session info
   * @throws UnauthorizedException when the token is invalid/expired or the person left the guild
   */
  async refresh(input: RefreshTokenInput): Promise<AuthTokens> {
    const payload = await readToken(
      input.refreshToken,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.refresh,
    );
    if (!payload) throw new UnauthorizedException(SESSION_EXPIRED);

    return this.issueTokens(payload.sub);
  }

  /**
   * Session info for the access token in use.
   * @param payload - JWT payload attached by JwtAuthGuard
   * @returns Discord ID, role and the character bound to the account
   * @throws UnauthorizedException when the account is no longer valid
   */
  async me(payload: JwtPayload): Promise<SessionUser> {
    return this.describeSession(payload.sub);
  }

  /** Discord Application config read from env. */
  private get discordConfig(): DiscordConfig {
    return {
      clientId: this.config.get('DISCORD_CLIENT_ID', { infer: true }),
      clientSecret: this.config.get('DISCORD_CLIENT_SECRET', { infer: true }),
      redirectUri: this.config.get('DISCORD_REDIRECT_URI', { infer: true }),
    };
  }

  /** Frontend origin, used for every redirect URL returned. */
  private get webOrigin(): string {
    return this.config.get('WEB_ORIGIN', { infer: true });
  }

  /**
   * Verify the `state` token and read the return path out of it.
   * @param value - The state value Discord echoed back
   * @returns The sanitised return path, or null when the state is unusable
   */
  private async readState(value: string): Promise<{ redirect: string } | null> {
    const payload = await this.jwt
      .verifyAsync<{ type?: string; redirect?: string }>(value)
      .catch(() => null);

    if (payload?.type !== TOKEN_TYPE.oauthState) return null;

    return { redirect: safeRedirect(payload.redirect) };
  }

  /**
   * Write a fresh exchange code for the authenticated Discord ID.
   * @param discordId - Discord ID that passed the membership check
   * @returns The random code to attach to the URL sent back to the web app
   */
  private async issueExchangeCode(discordId: string): Promise<string> {
    const id = randomBytes(32).toString('base64url');

    await this.prisma.authExchange.create({
      data: {
        id,
        discordId,
        expiresAt: new Date(this.clock.now().getTime() + EXCHANGE_TTL_MS),
      },
    });

    return id;
  }

  /**
   * Build session info from a Discord ID.
   * @param discordId - Discord ID of the signing-in user
   * @returns Contract-verified session info
   * @throws UnauthorizedException when the person left the guild and is not a rescue admin
   */
  private async describeSession(discordId: string): Promise<SessionUser> {
    const member = await this.characters.findByDiscordId(discordId);
    const isRescue = isRescueAdmin(
      discordId,
      this.config.get('DISCORD_ADMIN_IDS', { infer: true }),
    );

    if (!member && !isRescue) throw new UnauthorizedException(SESSION_EXPIRED);

    const row = member ? await this.characters.findById(member.id) : null;

    return verifyResponse(sessionUserSchema, {
      discordId,
      discordUsername: row?.discordUsername ?? null,
      discordAvatar: row?.discordAvatar ?? null,
      role: resolveGuildRole({ isRescue, memberRole: member?.role ?? null }),
      character: row ? toCharacter(row) : null,
    } satisfies SessionUser);
  }

  /**
   * Sign a token pair for a Discord ID.
   * @param discordId - The authenticated Discord ID
   * @returns The token pair with its session info
   */
  private async issueTokens(discordId: string): Promise<AuthTokens> {
    const user = await this.describeSession(discordId);
    const base = { sub: discordId, role: user.role } as const;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: TOKEN_TYPE.access } satisfies JwtPayload,
        {
          expiresIn: ACCESS_TOKEN_TTL,
        },
      ),
      this.jwt.signAsync(
        { ...base, type: TOKEN_TYPE.refresh } satisfies JwtPayload,
        {
          expiresIn: REFRESH_TOKEN_TTL,
        },
      ),
    ]);

    return { accessToken, refreshToken, user };
  }

  /**
   * The login page URL carrying an error code.
   * @param error - An error code from the AUTH_ERROR table
   * @param redirect - Path the user was heading to, to retry after login
   * @returns The absolute redirect URL
   */
  private errorUrl(error: string, redirect: string): string {
    return webUrl(this.webOrigin, LOGIN_PATH, { error, redirect });
  }
}
