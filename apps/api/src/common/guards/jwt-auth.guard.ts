import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { readBearerToken } from '../auth/read-bearer-token';
import { TOKEN_TYPE, type JwtPayload } from '../constants/auth.constant';

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

    const payload = await readBearerToken(
      request.headers.authorization,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.access,
    );

    // Một câu cho mọi trường hợp: với người dùng, thiếu token và token hỏng dẫn tới cùng một hành
    // động; với kẻ dò, phân biệt hai ca là thông tin thừa.
    if (!payload) throw new UnauthorizedException('Bạn cần đăng nhập.');

    request.user = payload;
    return true;
  }
}
