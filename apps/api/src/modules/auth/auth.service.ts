import { createHash, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthTokens,
  LoginInput,
  RefreshTokenInput,
} from '@guild/shared/schemas';

import { ADMIN_ROLE, TOKEN_TYPE, type JwtPayload } from '../../common';
import type { AppConfigService } from '../../config';
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from './auth.constant';

/** Thông báo dùng chung cho mọi trường hợp thông tin đăng nhập không khớp. */
const INVALID_CREDENTIALS = 'Tên đăng nhập hoặc mật khẩu không đúng.';

/** Thông báo khi refresh token hỏng, hết hạn hoặc thuộc tài khoản không còn quyền. */
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.';

/**
 * Xác thực quản trị viên và phát JWT.
 * Danh sách tài khoản lấy từ biến môi trường (ADMIN_USERNAMES/ADMIN_PASSWORD) — chưa có bảng user
 * trong database vì mọi admin đều toàn quyền và số lượng rất ít.
 */
@Injectable()
export class AuthService {
  constructor(
    // AppConfigService chỉ là type alias của ConfigService<Env> nên phải chỉ token tường minh.
    @Inject(ConfigService) private readonly config: AppConfigService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Kiểm tra thông tin đăng nhập và phát cặp token nếu hợp lệ.
   * @param input - Tên đăng nhập và mật khẩu người dùng nhập
   * @returns Access token, refresh token và thông tin tài khoản
   * @throws UnauthorizedException khi tên đăng nhập không thuộc danh sách admin hoặc sai mật khẩu
   */
  async login(input: LoginInput): Promise<AuthTokens> {
    const username = normalize(input.username);

    if (!this.adminUsernames.includes(username)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    const expected = this.config.get('ADMIN_PASSWORD', { infer: true });
    if (!matchesPassword(input.password, expected)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.issueTokens(username);
  }

  /**
   * Đổi refresh token còn hạn thành cặp token mới.
   * @param input - Refresh token lấy từ lần đăng nhập/refresh trước
   * @returns Cặp token mới và thông tin tài khoản
   * @throws UnauthorizedException khi token sai/hết hạn, không phải refresh token,
   * hoặc tài khoản đã bị bỏ khỏi danh sách admin
   */
  async refresh(input: RefreshTokenInput): Promise<AuthTokens> {
    const payload = await this.jwt
      .verifyAsync<JwtPayload>(input.refreshToken)
      .catch(() => null);

    if (payload?.type !== TOKEN_TYPE.refresh) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }
    if (!this.adminUsernames.includes(payload.sub)) {
      throw new UnauthorizedException(SESSION_EXPIRED);
    }

    return this.issueTokens(payload.sub);
  }

  /** Danh sách tên đăng nhập admin đã chuẩn hóa chữ thường, đọc từ biến môi trường. */
  private get adminUsernames(): string[] {
    return this.config
      .get('ADMIN_USERNAMES', { infer: true })
      .split(',')
      .map(normalize)
      .filter((name) => name !== '');
  }

  /**
   * Ký access token và refresh token cho một tài khoản.
   * @param username - Tên đăng nhập đã chuẩn hóa và xác thực
   * @returns Cặp token kèm thông tin tài khoản
   */
  private async issueTokens(username: string): Promise<AuthTokens> {
    const base = { sub: username, role: ADMIN_ROLE } as const;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...base, type: TOKEN_TYPE.access } satisfies JwtPayload,
        { expiresIn: ACCESS_TOKEN_TTL },
      ),
      this.jwt.signAsync(
        { ...base, type: TOKEN_TYPE.refresh } satisfies JwtPayload,
        { expiresIn: REFRESH_TOKEN_TTL },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      user: { username, role: ADMIN_ROLE },
    } satisfies AuthTokens;
  }
}

/**
 * Chuẩn hóa tên đăng nhập để so khớp không phân biệt hoa thường và khoảng trắng thừa.
 * @param value - Tên đăng nhập thô
 * @returns Tên đăng nhập đã trim và chuyển chữ thường
 */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * So khớp mật khẩu theo kiểu constant-time.
 * Hash SHA-256 hai phía trước khi so để `timingSafeEqual` luôn nhận buffer cùng độ dài,
 * đồng thời không để lộ độ dài mật khẩu thật qua thời gian phản hồi.
 * @param plain - Mật khẩu người dùng nhập
 * @param expected - Mật khẩu admin cấu hình trong biến môi trường
 * @returns true nếu hai mật khẩu giống nhau
 */
function matchesPassword(plain: string, expected: string): boolean {
  return timingSafeEqual(sha256(plain), sha256(expected));
}

/**
 * Tính digest SHA-256 của một chuỗi.
 * @param value - Chuỗi cần hash
 * @returns Buffer digest dài 32 byte
 */
function sha256(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}
