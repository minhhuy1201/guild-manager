import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { canManageGuild } from '@guild/shared/lib';

import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Chặn mọi request không phải quản trị viên.
 *
 * Luôn đứng **sau** `JwtAuthGuard` (`@UseGuards(JwtAuthGuard, AdminGuard)`): guard này chỉ đọc
 * `request.user` do guard kia gắn, tự nó không verify token. Trước khi có nhiều vai, `JwtAuthGuard`
 * chính là kiểm tra quyền admin — từ khi token của bang chúng cũng hợp lệ thì không còn đúng nữa.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  /**
   * Kiểm vai của người gọi.
   * @param context - Ngữ cảnh thực thi, dùng để lấy request của Express
   * @returns true khi người gọi là quản trị viên
   * @throws ForbiddenException khi không phải quản trị viên, hoặc request chưa qua JwtAuthGuard
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.user?.role;

    if (!role || !canManageGuild(role)) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này.',
      );
    }

    return true;
  }
}
