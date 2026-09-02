import { UnauthorizedException } from '@nestjs/common';

import { CronSecretGuard } from '../cron.guard';

const SECRET = 'x'.repeat(32);

const CONFIG = { get: () => SECRET } as never;

/**
 * An execution context carrying one Authorization header.
 * @param authorization - Header value, undefined when absent
 * @returns The minimal context shape the guard reads
 */
function contextWith(authorization?: string): never {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as never;
}

describe('CronSecretGuard', () => {
  it('cho qua khi secret đúng', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(guard.canActivate(contextWith(`Bearer ${SECRET}`))).toBe(true);
  });

  it('từ chối khi thiếu header', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() => guard.canActivate(contextWith())).toThrow(
      UnauthorizedException,
    );
  });

  it('từ chối khi sai scheme', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() => guard.canActivate(contextWith(SECRET))).toThrow(
      UnauthorizedException,
    );
  });

  it('từ chối khi secret sai', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() =>
      guard.canActivate(contextWith(`Bearer ${'y'.repeat(32)}`)),
    ).toThrow(UnauthorizedException);
  });

  // Độ dài lệch phải ra "sai", không được ném từ timingSafeEqual.
  it('từ chối khi secret chỉ đúng phần đầu', () => {
    const guard = new CronSecretGuard(CONFIG);

    expect(() => guard.canActivate(contextWith('Bearer xxxx'))).toThrow(
      UnauthorizedException,
    );
  });
});
