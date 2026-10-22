import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import type { GrantLookup } from '../../auth/grant-lookup';
import {
  TOKEN_TYPE,
  type JwtPayload,
  type RequestActor,
} from '../../constants/auth.constant';
import { JwtAuthGuard } from '../jwt-auth.guard';

/**
 * A guard whose token verifies to the given payload.
 * @param payload - What the token carries, null for a token that fails verification
 * @param grants - What the lookup answers
 * @returns The guard, its lookup double and a function that runs one request through it
 */
function setup(
  payload: JwtPayload | null,
  grants: jest.Mock = jest.fn().mockResolvedValue({
    capabilities: [],
    grantedCommands: [],
  }),
) {
  const jwt = {
    verifyAsync: jest.fn(() =>
      payload ? Promise.resolve(payload) : Promise.reject(new Error('bad')),
    ),
  } as unknown as JwtService;
  const lookup = { forDiscordId: grants } as unknown as GrantLookup;
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

  return { run, grants, guard };
}

/**
 * An access-token payload.
 * @param role - Role the token carries
 * @returns The payload
 */
function payloadOf(role: GuildRole): JwtPayload {
  return { sub: 'discord-1', role, type: TOKEN_TYPE.access };
}

describe('JwtAuthGuard - Grant của Manager', () => {
  it('Manager mang theo Grant đọc từ database', async () => {
    const grants = jest.fn().mockResolvedValue({
      capabilities: [Capability.TACTICS],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });

    const user = await setup(payloadOf(GuildRole.MANAGER), grants).run();

    expect(grants).toHaveBeenCalledWith('discord-1');
    expect(user).toMatchObject({
      role: GuildRole.MANAGER,
      capabilities: [Capability.TACTICS],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it.each([GuildRole.ADMIN, GuildRole.MEMBER])(
    '%s không tốn thêm lần đọc nào',
    async (role) => {
      const { run, grants } = setup(payloadOf(role));

      const user = await run();

      expect(grants).not.toHaveBeenCalled();
      expect(user).toEqual(payloadOf(role));
    },
  );

  it('đọc lại mỗi request: thu Grant có hiệu lực ngay request kế tiếp', async () => {
    const grants = jest
      .fn()
      .mockResolvedValueOnce({
        capabilities: [Capability.CAT_RACE],
        grantedCommands: [],
      })
      .mockResolvedValueOnce({ capabilities: [], grantedCommands: [] });
    const { run } = setup(payloadOf(GuildRole.MANAGER), grants);

    const first = await run();
    const second = await run();

    expect(first?.capabilities).toEqual([Capability.CAT_RACE]);
    expect(second?.capabilities).toEqual([]);
  });

  it('vẫn từ chối token sai, và không đọc Grant của token sai', async () => {
    const { run, grants } = setup(null);

    await expect(run()).rejects.toThrow(UnauthorizedException);
    expect(grants).not.toHaveBeenCalled();
  });
});
