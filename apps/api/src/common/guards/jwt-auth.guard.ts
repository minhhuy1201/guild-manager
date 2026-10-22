import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GuildRole } from '@guild/shared/enums';
import type { Request } from 'express';

import { GrantLookup } from '../auth/grant-lookup';
import { readBearerToken } from '../auth/read-bearer-token';
import {
  TOKEN_TYPE,
  type JwtPayload,
  type RequestActor,
} from '../constants/auth.constant';

/** A request past this guard carries the user info. */
export interface AuthenticatedRequest extends Request {
  /** Payload of the verified access token, with a Manager's Grants */
  user?: RequestActor;
}

/**
 * Rejects requests without a valid access token in `Authorization: Bearer <token>`.
 * On success the payload is attached to `request.user` for `@CurrentUser()` to read. For a Manager
 * it also carries their Grants, read here on every request: Admin and Member cost no extra read.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly grants: GrantLookup,
  ) {}

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

    request.user =
      payload.role === GuildRole.MANAGER
        ? { ...payload, ...(await this.grants.forDiscordId(payload.sub)) }
        : payload;
    return true;
  }
}
