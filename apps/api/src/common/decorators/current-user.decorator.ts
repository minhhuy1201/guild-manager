import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { JwtPayload } from '../constants/auth.constant';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/**
 * Lấy payload của người dùng đang đăng nhập ra tham số của handler.
 * Chỉ dùng cho route đã gắn `JwtAuthGuard` — không có guard thì giá trị sẽ là undefined.
 */
export const CurrentUser = createParamDecorator(
  /**
   * Đọc `request.user` do JwtAuthGuard gắn vào.
   * @param _data - Tham số truyền vào decorator (không dùng)
   * @param context - Ngữ cảnh thực thi của request
   * @returns Payload JWT của người dùng đang đăng nhập
   */
  (_data: unknown, context: ExecutionContext): JwtPayload | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
