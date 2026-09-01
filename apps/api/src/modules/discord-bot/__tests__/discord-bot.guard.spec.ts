import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, sign } from 'node:crypto';

import type { Env } from '../../../config';
import { DiscordSignatureGuard } from '../discord-bot.guard';

/** Bytes of DER/SPKI before the raw 32-byte Ed25519 key. */
const SPKI_HEADER_LENGTH = 12;

const { publicKey, privateKey } = generateKeyPairSync('ed25519');

const publicKeyHex = publicKey
  .export({ format: 'der', type: 'spki' })
  .subarray(SPKI_HEADER_LENGTH)
  .toString('hex');

const timestamp = '1756700000';
const rawBody = '{"type":1}';

const signature = sign(
  null,
  Buffer.from(timestamp + rawBody),
  privateKey,
).toString('hex');

/**
 * Build a guard wired to the generated key pair.
 * @returns A guard reading `publicKeyHex` as DISCORD_PUBLIC_KEY
 */
function guard(): DiscordSignatureGuard {
  const config = {
    get: () => publicKeyHex,
  } as unknown as ConfigService<Env, true>;

  return new DiscordSignatureGuard(config);
}

/**
 * Build a fake ExecutionContext carrying the headers and raw body of a request.
 * @param headers - Request headers
 * @param body - Raw request body, as Nest's `rawBody` option provides it
 * @returns A context sufficient for the guard
 */
function contextFor(
  headers: Record<string, string>,
  body: Buffer | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, rawBody: body }),
    }),
  } as unknown as ExecutionContext;
}

describe('DiscordSignatureGuard', () => {
  it('cho qua request Discord ký đúng', () => {
    const context = contextFor(
      {
        'x-signature-ed25519': signature,
        'x-signature-timestamp': timestamp,
      },
      Buffer.from(rawBody),
    );

    expect(guard().canActivate(context)).toBe(true);
  });

  it('chặn request chữ ký sai bằng 401 — mã Discord bắt buộc', () => {
    const context = contextFor(
      {
        'x-signature-ed25519': 'f'.repeat(128),
        'x-signature-timestamp': timestamp,
      },
      Buffer.from(rawBody),
    );

    expect(() => guard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('chặn request thiếu header chữ ký', () => {
    const context = contextFor(
      { 'x-signature-timestamp': timestamp },
      Buffer.from(rawBody),
    );

    expect(() => guard().canActivate(context)).toThrow(UnauthorizedException);
  });

  it('chặn khi không có raw body — cấu hình rawBody đã bị gỡ mất', () => {
    const context = contextFor(
      {
        'x-signature-ed25519': signature,
        'x-signature-timestamp': timestamp,
      },
      undefined,
    );

    expect(() => guard().canActivate(context)).toThrow(UnauthorizedException);
  });
});
