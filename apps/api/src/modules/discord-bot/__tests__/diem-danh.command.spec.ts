import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { diemDanhCommand } from '../commands/diem-danh.command';
import { MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'diem-danh' },
  member: { user: { id: '111' } },
};

/**
 * Build deps around one resolved actor and one character row.
 * @param options.resolved - What ActorResolver.resolve returns
 * @param options.characterRow - What CharactersService.findById returns
 * @returns Stubbed deps
 */
function makeDeps(options: {
  resolved: unknown;
  characterRow?: unknown;
}): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(options.resolved) },
    characters: {
      findById: jest.fn().mockResolvedValue(options.characterRow ?? null),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: { getRecords: jest.fn().mockResolvedValue([]) },
  } as never;
}

describe('/diem-danh', () => {
  it('trả bảng riêng tư cho nhân vật của người gọi', async () => {
    const deps = makeDeps({
      resolved: {
        actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
        characterId: 'meo-beo-k7ma3x',
      },
      characterRow: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo' },
    });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('Mèo Béo');
  });

  it('nói rõ khi người gọi chưa được gán nhân vật', async () => {
    const deps = makeDeps({ resolved: null });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('chỉ admin cứu hộ không có nhân vật thì hướng sang /diem-danh-ho', async () => {
    const deps = makeDeps({
      resolved: {
        actor: { sub: '111', role: GuildRole.ADMIN, type: TOKEN_TYPE.access },
        characterId: null,
      },
    });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('/diem-danh-ho');
  });
});
