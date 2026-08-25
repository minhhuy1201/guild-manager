import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { canManageGuild } from '@guild/shared/lib';

import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Rejects every request that is not from an admin.
 *
 * Always sits **after** `JwtAuthGuard` (`@UseGuards(JwtAuthGuard, AdminGuard)`): it only reads the
 * `request.user` that guard set, it does not verify a token itself. Before multiple roles existed,
 * `JwtAuthGuard` was the admin check — that stopped being true once member tokens became valid too.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  /**
   * Check the caller's role.
   * @param context - Execution context, used to get the Express request
   * @returns true when the caller is an admin
   * @throws ForbiddenException when not an admin, or when the request never went through JwtAuthGuard
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
