import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { TOKEN_TYPE, type JwtPayload } from '../constants/auth.constant';

/** Prefix của header Authorization theo chuẩn Bearer. */
const BEARER_PREFIX = 'Bearer ';

/** Request đã qua guard thì có thêm thông tin người dùng. */
export interface AuthenticatedRequest extends Request {
  /** Payload của access token đã verify */
  user?: JwtPayload;
}

/**
 * Chặn request không có access token hợp lệ trong header `Authorization: Bearer <token>`.
 * Verify xong thì gắn payload vào `request.user` để `@CurrentUser()` đọc lại.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Kiểm tra access token của request.
   * @param context - Ngữ cảnh thực thi, dùng để lấy request của Express
   * @returns true khi token hợp lệ
   * @throws UnauthorizedException khi thiếu token, token sai/hết hạn, hoặc không phải access token
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;

    if (!header?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Bạn cần đăng nhập.');
    }

    const payload = await this.jwt
      .verifyAsync<JwtPayload>(header.slice(BEARER_PREFIX.length))
      .catch(() => null);

    if (payload?.type !== TOKEN_TYPE.access) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    }

    request.user = payload;
    return true;
  }
}
