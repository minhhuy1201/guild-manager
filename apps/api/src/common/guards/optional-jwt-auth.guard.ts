import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { readBearerToken } from '../auth/read-bearer-token';
import { TOKEN_TYPE, type JwtPayload } from '../constants/auth.constant';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Nhận diện người dùng nếu request có access token hợp lệ, nhưng không bao giờ chặn.
 * Dùng cho route phục vụ cả khách ẩn danh lẫn quản trị viên (ví dụ điểm danh):
 * handler tự quyết định dựa trên `request.user` có hay không.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Đọc và verify access token nếu có, gắn payload vào `request.user`.
   * @param context - Ngữ cảnh thực thi, dùng để lấy request của Express
   * @returns Luôn true — token hỏng/thiếu chỉ đồng nghĩa "không đăng nhập"
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const payload = await readBearerToken(
      request.headers.authorization,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.access,
    );

    if (payload) request.user = payload;

    return true;
  }
}
