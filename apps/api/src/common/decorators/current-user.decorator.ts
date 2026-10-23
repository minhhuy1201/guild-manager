import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { RequestActor } from '../constants/auth.constant';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard';

/**
 * Pulls the signed-in user's payload into a handler parameter.
 * Only for routes behind `JwtAuthGuard` — without it the value is undefined.
 */
export const CurrentUser = createParamDecorator(
  /**
   * Read `request.user` set by JwtAuthGuard.
   * @param _data - Decorator argument (unused)
   * @param context - Execution context of the request
   * @returns The signed-in user, with a Manager's Grants
   */
  (_data: unknown, context: ExecutionContext): RequestActor | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
