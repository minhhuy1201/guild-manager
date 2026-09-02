import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

import type { Env } from '../../config';

/** Authorization header prefix per the Bearer scheme, case-sensitive like `startsWith`. */
const BEARER_PREFIX = 'Bearer ';

/**
 * Compare two secrets without leaking how far they matched.
 * @param provided - Value read off the request
 * @param expected - The configured secret
 * @returns true when the two are byte-for-byte identical
 */
function secretsMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);

  // timingSafeEqual throws on a length mismatch, and a length mismatch is already the answer.
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Rejects every call to the cron endpoint that does not carry `CRON_SECRET`.
 *
 * Vercel attaches `Authorization: Bearer <CRON_SECRET>` to a scheduled invocation by itself. The
 * endpoint behind this guard messages the whole guild, so it must not be something a stranger who
 * guesses the path can fire.
 *
 * It lives in this module rather than `common/guards/` because it has exactly one consumer; a
 * second cron endpoint is when it moves.
 */
@Injectable()
export class CronSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Check the request's cron secret.
   * @param context - Execution context, used to get the Express request
   * @returns true when the secret matches
   * @throws UnauthorizedException when the header is missing, of the wrong scheme, or wrong
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    const provided = header?.startsWith(BEARER_PREFIX)
      ? header.slice(BEARER_PREFIX.length)
      : null;

    // One sentence for every case: telling a prober which part was wrong is free information.
    if (
      !provided ||
      !secretsMatch(provided, this.config.get('CRON_SECRET', { infer: true }))
    ) {
      throw new UnauthorizedException('Không có quyền gọi endpoint này.');
    }

    return true;
  }
}
