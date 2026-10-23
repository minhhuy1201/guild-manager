import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GuildRole } from '@guild/shared/enums';
import { can } from '@guild/shared/lib';

import { assertNever } from '../assert-never';
import {
  ACCESS_REQUIREMENT_METADATA,
  type AccessRequirement,
} from '../decorators/require-access.decorator';
import type { AuthenticatedRequest } from './jwt-auth.guard';

/**
 * Rejects every request whose caller lacks what the route declared with `@RequireCapability(...)`
 * or `@RequireAdmin()`.
 *
 * Always sits **after** `JwtAuthGuard` (`@UseGuards(JwtAuthGuard, CapabilityGuard)`): it only reads
 * the `request.user` that guard set, it does not verify a token itself. A route that declares nothing
 * fails loudly instead of letting everyone through.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Check the caller against the route's requirement.
   * @param context - Execution context, used to get the Express request and the route's metadata
   * @returns true when the caller meets the requirement
   * @throws ForbiddenException when the caller does not, or the request never went through JwtAuthGuard
   * @throws Error when the route declares no requirement
   */
  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<
      AccessRequirement | undefined
    >(ACCESS_REQUIREMENT_METADATA, [context.getHandler(), context.getClass()]);

    if (!requirement) {
      throw new Error(
        'CapabilityGuard needs @RequireCapability(...) or @RequireAdmin() on the route or its controller.',
      );
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;

    if (!user || !this.allows(user, requirement)) {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này.',
      );
    }

    return true;
  }

  /**
   * Whether the caller meets one requirement.
   * @param user - Verified token payload
   * @param requirement - What the route demands
   * @returns true when met
   */
  private allows(
    user: NonNullable<AuthenticatedRequest['user']>,
    requirement: AccessRequirement,
  ): boolean {
    switch (requirement.kind) {
      case 'capability':
        return can(user, requirement.capability);
      case 'admin':
        return user.role === GuildRole.ADMIN;
      default:
        return assertNever(requirement, 'access requirement');
    }
  }
}
