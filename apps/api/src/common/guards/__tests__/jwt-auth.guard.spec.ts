import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import type { ActorLookup, CurrentActor } from '../../auth/actor-lookup';
import {
  TOKEN_TYPE,
  type JwtPayload,
  type RequestActor,
} from '../../constants/auth.constant';
import { JwtAuthGuard } from '../jwt-auth.guard';

/**
 * What the lookup answers when nothing special is set up.
 * @param role - Role stored for the caller today
 * @param grants - Grants stored for the caller today
 * @returns The lookup answer
 */
function currentOf(
  role: GuildRole,
  grants: Partial<CurrentActor> = {},
): CurrentActor {
  return { role, capabilities: [], grantedCommands: [], ...grants };
}

/**
 * A guard whose token verifies to the given payload.
 * @param payload - What the token carries, null for a token that fails verification
 * @param current - What the lookup answers
 * @returns The guard's lookup double and a function that runs one request through it
 */
function setup(
  payload: JwtPayload | null,
  current: jest.Mock = jest
    .fn()
    .mockResolvedValue(currentOf(GuildRole.MANAGER)),
) {
  const jwt = {
    verifyAsync: jest.fn(() =>
      payload ? Promise.resolve(payload) : Promise.reject(new Error('bad')),
    ),
  } as unknown as JwtService;
  const lookup = { current } as unknown as ActorLookup;
  const guard = new JwtAuthGuard(jwt, lookup);

  /**
   * Run one request and read back the caller the guard attached.
   * @returns The `request.user` after the guard ran
   */
  async function run(): Promise<RequestActor | undefined> {
    const request: { headers: object; user?: RequestActor } = {
      headers: { authorization: 'Bearer token' },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await guard.canActivate(context);

    return request.user;
  }

  return { run, current };
}

/**
 * An access-token payload.
 * @param role - Role the token carries
 * @returns The payload
 */
function payloadOf(role: GuildRole): JwtPayload {
  return { sub: 'discord-1', role, type: TOKEN_TYPE.access };
}

describe('JwtAuthGuard - vai và Grant đọc lại mỗi request', () => {
  it('Manager mang theo Grant đọc từ database', async () => {
    const current = jest.fn().mockResolvedValue(
      currentOf(GuildRole.MANAGER, {
        capabilities: [Capability.TACTICS],
        grantedCommands: [GrantableCommand.THONG_BAO],
      }),
    );

    const user = await setup(payloadOf(GuildRole.MANAGER), current).run();

    expect(current).toHaveBeenCalledWith('discord-1');
    expect(user).toMatchObject({
      role: GuildRole.MANAGER,
      capabilities: [Capability.TACTICS],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it('token Member cũng đọc lại: Member giữ vai Member và không Grant', async () => {
    const current = jest.fn().mockResolvedValue(currentOf(GuildRole.MEMBER));

    const user = await setup(payloadOf(GuildRole.MEMBER), current).run();

    expect(current).toHaveBeenCalledWith('discord-1');
    expect(user).toMatchObject({
      role: GuildRole.MEMBER,
      capabilities: [],
      grantedCommands: [],
    });
  });

  it('token Member mà hàng giờ là Quản lý có Grant thì dùng được Grant ngay request kế tiếp', async () => {
    const current = jest
      .fn()
      .mockResolvedValue(
        currentOf(GuildRole.MANAGER, { capabilities: [Capability.SCHEDULE] }),
      );

    const user = await setup(payloadOf(GuildRole.MEMBER), current).run();

    expect(user).toMatchObject({
      role: GuildRole.MANAGER,
      capabilities: [Capability.SCHEDULE],
    });
  });

  it('token Admin cũng đọc lại vai', async () => {
    const current = jest.fn().mockResolvedValue(currentOf(GuildRole.ADMIN));

    const user = await setup(payloadOf(GuildRole.ADMIN), current).run();

    expect(current).toHaveBeenCalledWith('discord-1');
    expect(user?.role).toBe(GuildRole.ADMIN);
  });

  it('token Admin mà hàng giờ là Quản lý thì mất quyền Admin ngay', async () => {
    const current = jest.fn().mockResolvedValue(currentOf(GuildRole.MANAGER));

    const user = await setup(payloadOf(GuildRole.ADMIN), current).run();

    expect(user?.role).toBe(GuildRole.MANAGER);
    expect(user?.capabilities).toEqual([]);
  });

  it('token Manager mà hàng giờ là Member thì mất cả vai lẫn Grant', async () => {
    const current = jest.fn().mockResolvedValue(currentOf(GuildRole.MEMBER));

    const user = await setup(payloadOf(GuildRole.MANAGER), current).run();

    expect(user?.role).toBe(GuildRole.MEMBER);
    expect(user?.capabilities).toEqual([]);
    expect(user?.grantedCommands).toEqual([]);
  });

  it('đọc lại mỗi request: thu Grant có hiệu lực ngay request kế tiếp', async () => {
    const current = jest
      .fn()
      .mockResolvedValueOnce(
        currentOf(GuildRole.MANAGER, { capabilities: [Capability.CAT_RACE] }),
      )
      .mockResolvedValueOnce(currentOf(GuildRole.MANAGER));
    const { run } = setup(payloadOf(GuildRole.MANAGER), current);

    const first = await run();
    const second = await run();

    expect(first?.capabilities).toEqual([Capability.CAT_RACE]);
    expect(second?.capabilities).toEqual([]);
  });

  it('vẫn từ chối token sai, và không đọc gì cho token sai', async () => {
    const { run, current } = setup(null);

    await expect(run()).rejects.toThrow(UnauthorizedException);
    expect(current).not.toHaveBeenCalled();
  });
});
