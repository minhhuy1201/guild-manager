import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { GuildRole } from '@guild/shared/enums';

import { AdminGuard } from '../admin.guard';
import { TOKEN_TYPE, type JwtPayload } from '../../constants/auth.constant';

/**
 * Dựng ExecutionContext giả chỉ mang `request.user`.
 * @param user - Payload JWT mà JwtAuthGuard lẽ ra đã gắn, undefined khi chưa qua guard đó
 * @returns Context đủ dùng cho AdminGuard
 */
function contextWith(user?: JwtPayload): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  it('cho quản trị viên đi qua', () => {
    const user: JwtPayload = {
      sub: '123',
      role: GuildRole.ADMIN,
      type: TOKEN_TYPE.access,
    };

    expect(guard.canActivate(contextWith(user))).toBe(true);
  });

  it('chặn cán bộ và bang chúng', () => {
    for (const role of [GuildRole.LEADER, GuildRole.MEMBER]) {
      const user: JwtPayload = { sub: '123', role, type: TOKEN_TYPE.access };

      expect(() => guard.canActivate(contextWith(user))).toThrow(
        ForbiddenException,
      );
    }
  });

  it('chặn khi request chưa qua JwtAuthGuard', () => {
    expect(() => guard.canActivate(contextWith())).toThrow(ForbiddenException);
  });
});
