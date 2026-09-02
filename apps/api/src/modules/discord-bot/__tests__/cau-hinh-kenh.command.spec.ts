import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { cauHinhKenhCommand } from '../commands/cau-hinh-kenh.command';
import type { CommandDeps } from '../commands/command.types';
import { MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'cau-hinh-kenh' },
  member: { user: { id: '111' } },
};

/**
 * A resolved actor carrying the given role.
 * @param role - Guild role the caller signs in with
 * @returns The shape ActorResolver.resolve returns
 */
function actor(role: GuildRole): unknown {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    characterId: 'meo-beo-k7ma3x',
  };
}

/**
 * Build deps around one resolved actor and one REST outcome.
 * @param resolved - What ActorResolver.resolve returns
 * @param postMessage - Stub standing in for the confirmation post
 * @returns Stubbed deps plus the `set` mock, for assertions
 */
function makeDeps(resolved: unknown, postMessage: jest.Mock) {
  const set = jest.fn().mockResolvedValue(undefined);

  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    rest: { postMessage },
    channels: { set },
  } as never as CommandDeps;

  return { deps, set };
}

describe('/cau-hinh-kenh', () => {
  it('lưu đúng channel đang gõ lệnh', async () => {
    const postMessage = jest.fn().mockResolvedValue(undefined);
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith('424242', expect.anything());
    expect(set).toHaveBeenCalledWith('424242');
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  // Sai quyền phải lộ ra ngay lúc cấu hình, không phải 9h sáng hôm sau trong log không ai đọc.
  it('không lưu gì khi Discord từ chối tin xác nhận', async () => {
    const postMessage = jest
      .fn()
      .mockRejectedValue(new Error('Discord từ chối (403)'));
    const { deps, set } = makeDeps(actor(GuildRole.ADMIN), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('quyền');
  });

  it('thành viên thường bị từ chối, và chỉ mình họ thấy', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(actor(GuildRole.MEMBER), postMessage);

    const reply = await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('Discord ID không gán với ai thì bị từ chối', async () => {
    const postMessage = jest.fn();
    const { deps, set } = makeDeps(null, postMessage);

    await cauHinhKenhCommand.execute(INTERACTION, deps);

    expect(set).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
  });
});
