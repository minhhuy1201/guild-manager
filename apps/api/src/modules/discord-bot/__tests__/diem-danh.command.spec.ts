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
 * Build deps around one resolved actor.
 * `findById` is stubbed but never expected to run: the caller's row rides along in `resolve`.
 * @param options.resolved - What ActorResolver.resolve returns
 * @returns The deps, plus the CharactersService stub so a test can count its calls
 */
function makeDeps(options: { resolved: unknown }): {
  deps: CommandDeps;
  characters: Record<string, jest.Mock>;
} {
  const characters = { findById: jest.fn().mockResolvedValue(null) };
  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(options.resolved) },
    characters,
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: { getRecordsForSessions: jest.fn().mockResolvedValue([]) },
  } as never;

  return { deps, characters };
}

describe('/diem-danh', () => {
  it('trả bảng riêng tư cho nhân vật của người gọi', async () => {
    const { deps, characters } = makeDeps({
      resolved: {
        actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
        character: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '111' },
      },
    });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(reply.data.content).toContain('Mèo Béo');
    // The row came out of `resolve`; reading it again by id would be a second trip for data already
    // in hand.
    expect(characters.findById).not.toHaveBeenCalled();
  });

  it('nói rõ khi người gọi chưa được gán nhân vật', async () => {
    const { deps } = makeDeps({ resolved: null });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });

  it('chỉ admin cứu hộ không có nhân vật thì hướng sang /diem-danh-ho', async () => {
    const { deps } = makeDeps({
      resolved: {
        actor: { sub: '111', role: GuildRole.ADMIN, type: TOKEN_TYPE.access },
        character: null,
      },
    });

    const reply = await diemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('/diem-danh-ho');
  });
});
