import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import type { Env } from '../../config';
import {
  DISCORD_SIGNATURE_HEADER,
  DISCORD_TIMESTAMP_HEADER,
} from './discord.constants';
import { isValidDiscordSignature } from './verify-signature';

/**
 * The bot's only trust boundary: the interaction endpoint is public on the internet, and this
 * signature is the sole thing separating Discord from anyone else who found the URL.
 *
 * Everything that fails answers `401`. Discord itself sends a deliberately bad signature while
 * saving the endpoint URL and requires exactly that status; any other code and it refuses the URL.
 */
@Injectable()
export class DiscordSignatureGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /**
   * Check the Ed25519 signature Discord put on the request.
   * @param context - Execution context, used to read headers and the raw body
   * @returns true when the signature matches this exact payload
   * @throws UnauthorizedException when a header is missing, the raw body is unavailable, or the
   *   signature does not match
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();

    const signature = request.headers[DISCORD_SIGNATURE_HEADER];
    const timestamp = request.headers[DISCORD_TIMESTAMP_HEADER];

    // The signature covers the bytes as they arrived. Re-serialising the parsed body produces
    // different bytes, so without `rawBody: true` in main.ts nothing here can ever pass — fail
    // loudly rather than let a config regression look like Discord sending bad signatures.
    const rawBody = request.rawBody;

    const isValid =
      typeof signature === 'string' &&
      typeof timestamp === 'string' &&
      rawBody !== undefined &&
      isValidDiscordSignature({
        publicKey: this.config.get('DISCORD_PUBLIC_KEY', { infer: true }),
        signature,
        timestamp,
        rawBody: rawBody.toString('utf8'),
      });

    // One sentence for every case: to Discord the distinction is irrelevant, to a prober it is free
    // information about which half of the check failed.
    if (!isValid) {
      throw new UnauthorizedException('Chữ ký Discord không hợp lệ.');
    }

    return true;
  }
}
