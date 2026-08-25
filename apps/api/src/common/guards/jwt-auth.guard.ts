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

/** A request past this guard carries the user info. */
export interface AuthenticatedRequest extends Request {
  /** Payload of the verified access token */
  user?: JwtPayload;
}

/**
 * Rejects requests without a valid access token in `Authorization: Bearer <token>`.
 * On success the payload is attached to `request.user` for `@CurrentUser()` to read.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  /**
   * Check the request's access token.
   * @param context - Execution context, used to get the Express request
   * @returns true when the token is valid
   * @throws UnauthorizedException when the token is missing, invalid/expired, or not an access token
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const payload = await readBearerToken(
      request.headers.authorization,
      (token) => this.jwt.verifyAsync<JwtPayload>(token),
      TOKEN_TYPE.access,
    );

    // One sentence for every case: to a user, a missing and a malformed token lead to the same
    // action; to a prober, telling the two apart is free information.
    if (!payload) throw new UnauthorizedException('Bạn cần đăng nhập.');

    request.user = payload;
    return true;
  }
}
