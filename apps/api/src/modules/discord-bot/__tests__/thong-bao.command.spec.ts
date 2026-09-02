import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { thongBaoCommand } from '../commands/thong-bao.command';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'thong-bao' },
  member: { user: { id: '111' } },
};

/**
 * Build deps around one resolved actor.
 * @param resolved - What ActorResolver.resolve returns
 * @returns Stubbed deps holding no battle session
 */
function makeDeps(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    characters: {},
    attendance: {},
    links: {
      webOrigin: 'https://mmgh-nth.vercel.app',
      guildRoleId: '999888777',
    },
  } as never;
}

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

describe('/thong-bao', () => {
  it('admin đăng được thông báo công khai có mention role', async () => {
    const reply = await thongBaoCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.ADMIN)),
    );

    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBeUndefined();
    expect(reply.data.content).toBe('<@&999888777>');
  });

  it('thành viên thường bị từ chối, và chỉ mình họ thấy', async () => {
    const reply = await thongBaoCommand.execute(
      INTERACTION,
      makeDeps(actor(GuildRole.MEMBER)),
    );

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toBe('Chỉ admin mới đăng thông báo được.');
  });

  it('Discord ID chưa gán nhân vật nào thì nói rõ', async () => {
    const reply = await thongBaoCommand.execute(INTERACTION, makeDeps(null));

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('không đọc lịch khi người gọi không đủ quyền', async () => {
    const listByWeek = jest.fn().mockResolvedValue([]);
    const deps = {
      ...makeDeps(actor(GuildRole.MEMBER)),
      battleSessions: { listByWeek },
    } as unknown as CommandDeps;

    await thongBaoCommand.execute(INTERACTION, deps);

    expect(listByWeek).not.toHaveBeenCalled();
  });
});
