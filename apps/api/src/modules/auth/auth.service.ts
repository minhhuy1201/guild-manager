import { randomBytes } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GuildRole } from '@guild/shared/enums';
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

/** Thông báo duy nhất cho mọi ca phiên không dùng được — phân biệt là thông tin thừa. */
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';

/** Đường dẫn trang đăng nhập ở web. */
const LOGIN_PATH = '/dang-nhap';

/** Đường dẫn route handler nhận mã đổi ở web. */
const CALLBACK_PATH = '/dang-nhap/discord';

/**
 * Xác thực bằng Discord OAuth2 và phát JWT.
 *
 * Danh tính đến từ cột `Character.discordId` do quản trị viên nhập tay: đăng nhập là một phép tra
 * cứu, không khớp thì cấm hoàn toàn. `DISCORD_ADMIN_IDS` là lối vào cứu hộ duy nhất cho tình huống
 * chưa ai được gán ID.
 */
@Injectable()
export class AuthService {
  constructor(
    // AppConfigService chỉ là type alias của ConfigService<Env> nên phải chỉ token tường minh.
    @Inject(ConfigService) private readonly config: AppConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly characters: CharactersService,
    private readonly clock: Clock,
  ) {}

  /**
   * Dựng URL đưa người dùng sang Discord, mang theo state đã ký.
   * @param redirect - Đường dẫn muốn quay lại sau khi đăng nhập
   * @returns URL tuyệt đối để redirect sang Discord
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
   * Xử lý callback của Discord và cho biết phải redirect người dùng đi đâu.
   *
   * Không bao giờ ném: trình duyệt đang ở giữa một chuỗi redirect chứ không phải trong một lời gọi
   * fetch, nên mọi lỗi đều phải trở thành một URL kèm mã lỗi.
   * @param query - Tham số Discord gắn vào callback
   * @returns URL tuyệt đối để trả trong header Location
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
    if (!member && !this.isRescueAdmin(profile.id)) {
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
   * Đổi mã dùng-một-lần lấy cặp JWT.
   * @param input - Mã lấy từ query string mà API vừa redirect về web
   * @returns Cặp token và thông tin phiên
   * @throws UnauthorizedException khi mã sai, đã dùng, hoặc đã quá 60 giây
   */
  async exchange(input: DiscordExchangeInput): Promise<AuthTokens> {
    const now = this.clock.now();

    // Dọn rác ngay tại đây thay vì dựng cron cho một bảng vài hàng.
    await this.prisma.authExchange.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Tiêu mã bằng một update nguyên tử: hai request cùng mã thì chỉ một request thắng.
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
   * Đổi refresh token còn hạn thành cặp token mới.
   *
   * Đây là chỗ việc đuổi một người khỏi hệ thống có hiệu lực: `discordId` đã bị gỡ khỏi mọi nhân
   * vật (và không nằm trong danh sách cứu hộ) thì phiên chấm dứt.
   * @param input - Refresh token hiện tại
   * @returns Cặp token mới và thông tin phiên
   * @throws UnauthorizedException khi token hỏng/hết hạn hoặc người này không còn trong bang
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
   * Thông tin phiên của access token đang dùng.
   * @param payload - Payload JWT do JwtAuthGuard gắn vào request
   * @returns Discord ID, vai và nhân vật gắn với tài khoản
   * @throws UnauthorizedException khi tài khoản không còn hợp lệ
   */
  async me(payload: JwtPayload): Promise<SessionUser> {
    return this.describeSession(payload.sub);
  }

  /** Cấu hình Discord Application đọc từ env. */
  private get discordConfig(): DiscordConfig {
    return {
      clientId: this.config.get('DISCORD_CLIENT_ID', { infer: true }),
      clientSecret: this.config.get('DISCORD_CLIENT_SECRET', { infer: true }),
      redirectUri: this.config.get('DISCORD_REDIRECT_URI', { infer: true }),
    };
  }

  /** Origin của frontend, dùng cho mọi URL redirect trả về. */
  private get webOrigin(): string {
    return this.config.get('WEB_ORIGIN', { infer: true });
  }

  /**
   * Discord ID này có nằm trong danh sách cứu hộ không.
   * @param discordId - Discord ID vừa đọc từ hồ sơ
   * @returns true khi ID thuộc danh sách DISCORD_ADMIN_IDS
   */
  private isRescueAdmin(discordId: string): boolean {
    return this.config
      .get('DISCORD_ADMIN_IDS', { infer: true })
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value !== '')
      .includes(discordId);
  }

  /**
   * Verify token `state` và đọc đường dẫn quay lại.
   * @param value - Giá trị state Discord trả lại
   * @returns Đường dẫn quay lại đã lọc, hoặc null khi state không dùng được
   */
  private async readState(value: string): Promise<{ redirect: string } | null> {
    const payload = await this.jwt
      .verifyAsync<{ type?: string; redirect?: string }>(value)
      .catch(() => null);

    if (payload?.type !== TOKEN_TYPE.oauthState) return null;

    return { redirect: safeRedirect(payload.redirect) };
  }

  /**
   * Ghi một mã đổi mới cho Discord ID vừa xác thực.
   * @param discordId - Discord ID đã qua kiểm tra tư cách thành viên
   * @returns Mã ngẫu nhiên để gắn vào URL trả về web
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
   * Dựng thông tin phiên từ Discord ID.
   * @param discordId - Discord ID của người đăng nhập
   * @returns Thông tin phiên đã verify theo contract
   * @throws UnauthorizedException khi người này không còn trong bang và không phải admin cứu hộ
   */
  private async describeSession(discordId: string): Promise<SessionUser> {
    const member = await this.characters.findByDiscordId(discordId);
    const isRescue = this.isRescueAdmin(discordId);

    if (!member && !isRescue) throw new UnauthorizedException(SESSION_EXPIRED);

    const row = member ? await this.characters.findById(member.id) : null;

    return verifyResponse(sessionUserSchema, {
      discordId,
      discordUsername: row?.discordUsername ?? null,
      discordAvatar: row?.discordAvatar ?? null,
      // Danh sách cứu hộ thắng giá trị trong database: quản trị viên không tự khoá mình ra ngoài.
      role: isRescue ? GuildRole.ADMIN : (member?.role ?? GuildRole.MEMBER),
      character: row ? toCharacter(row) : null,
    } satisfies SessionUser);
  }

  /**
   * Ký cặp token cho một Discord ID.
   * @param discordId - Discord ID đã xác thực
   * @returns Cặp token kèm thông tin phiên
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
   * URL trang đăng nhập kèm mã lỗi.
   * @param error - Mã lỗi trong bảng AUTH_ERROR
   * @param redirect - Đường dẫn người dùng định vào, để thử lại sau khi đăng nhập
   * @returns URL tuyệt đối để redirect
   */
  private errorUrl(error: string, redirect: string): string {
    return webUrl(this.webOrigin, LOGIN_PATH, { error, redirect });
  }
}
