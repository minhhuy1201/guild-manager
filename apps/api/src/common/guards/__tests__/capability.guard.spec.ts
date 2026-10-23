import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import { CapabilityGuard } from '../capability.guard';
import { RequireAdmin } from '../../decorators/require-access.decorator';
import { RequireCapability } from '../../decorators/require-access.decorator';
import { TOKEN_TYPE, type RequestActor } from '../../constants/auth.constant';

/** A controller with one route per requirement, so the guard reads real decorator metadata. */
class Sample {
  @RequireCapability(Capability.SCHEDULE)
  schedule(): void {}

  @RequireAdmin()
  adminOnly(): void {}

  undeclared(): void {}
}

/**
 * Build a fake ExecutionContext for one route of `Sample`, carrying only `request.user`.
 * @param handler - Name of the route being entered
 * @param user - Caller JwtAuthGuard would have attached, undefined when it never ran
 * @returns A context sufficient for CapabilityGuard
 */
function contextWith(
  handler: keyof Sample,
  user?: RequestActor,
): ExecutionContext {
  return {
    // Metadata is read off the method reference and the method is never called.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    getHandler: () => Sample.prototype[handler],
    getClass: () => Sample,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

/**
 * A verified access-token payload.
 * @param role - Role the token carries
 * @param grants - Grants JwtAuthGuard would have read for a Manager
 * @returns The caller JwtAuthGuard would attach
 */
function userOf(
  role: GuildRole,
  grants: Partial<Pick<RequestActor, 'capabilities' | 'grantedCommands'>> = {},
): RequestActor {
  return {
    sub: '123',
    role,
    type: TOKEN_TYPE.access,
    capabilities: [],
    grantedCommands: [],
    ...grants,
  };
}

describe('CapabilityGuard', () => {
  const guard = new CapabilityGuard(new Reflector());

  it('cho quản trị viên đi qua route đòi một Capability', () => {
    expect(
      guard.canActivate(contextWith('schedule', userOf(GuildRole.ADMIN))),
    ).toBe(true);
  });

  it('chặn bang chúng ở route đòi một Capability', () => {
    expect(() =>
      guard.canActivate(contextWith('schedule', userOf(GuildRole.MEMBER))),
    ).toThrow(ForbiddenException);
  });

  it('cho quản trị viên đi qua route chỉ Admin', () => {
    expect(
      guard.canActivate(contextWith('adminOnly', userOf(GuildRole.ADMIN))),
    ).toBe(true);
  });

  it('chặn bang chúng ở route chỉ Admin', () => {
    expect(() =>
      guard.canActivate(contextWith('adminOnly', userOf(GuildRole.MEMBER))),
    ).toThrow(ForbiddenException);
  });

  it('cho Manager đi qua khi có đúng Capability', () => {
    const manager = userOf(GuildRole.MANAGER, {
      capabilities: [Capability.SCHEDULE],
    });

    expect(guard.canActivate(contextWith('schedule', manager))).toBe(true);
  });

  it('chặn Manager chưa có Grant nào, như Member', () => {
    expect(() =>
      guard.canActivate(contextWith('schedule', userOf(GuildRole.MANAGER))),
    ).toThrow(ForbiddenException);
  });

  it('chặn Manager có Capability khác', () => {
    const manager = userOf(GuildRole.MANAGER, {
      capabilities: [Capability.TACTICS],
    });

    expect(() => guard.canActivate(contextWith('schedule', manager))).toThrow(
      ForbiddenException,
    );
  });

  it('Grant command không mở route Capability', () => {
    const manager = userOf(GuildRole.MANAGER, {
      grantedCommands: Object.values(GrantableCommand),
    });

    expect(() => guard.canActivate(contextWith('schedule', manager))).toThrow(
      ForbiddenException,
    );
  });

  it('route chỉ Admin chặn Manager dù được cấp mọi Capability', () => {
    const manager = userOf(GuildRole.MANAGER, {
      capabilities: Object.values(Capability),
      grantedCommands: Object.values(GrantableCommand),
    });

    expect(() => guard.canActivate(contextWith('adminOnly', manager))).toThrow(
      ForbiddenException,
    );
  });

  it('chặn khi request chưa qua JwtAuthGuard', () => {
    expect(() => guard.canActivate(contextWith('schedule'))).toThrow(
      ForbiddenException,
    );
  });

  it('báo lỗi cấu hình khi route quên khai báo yêu cầu, thay vì mở cửa', () => {
    expect(() =>
      guard.canActivate(contextWith('undeclared', userOf(GuildRole.ADMIN))),
    ).toThrow(/RequireCapability/);
  });
});
