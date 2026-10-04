import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { huyNghiPhepCommand } from '../commands/huy-nghi-phep.command';
import type { CommandDeps } from '../commands/command.types';

const ACTOR = { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access };
const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'huy-nghi-phep' },
  member: { user: { id: '111' } },
};
const LINKED = {
  actor: ACTOR,
  character: { id: 'meo-beo', name: 'Mèo Béo', discordId: '111' },
};

function makeDeps(active: unknown[]) {
  const cancel = jest
    .fn()
    .mockImplementation((id: string) =>
      Promise.resolve(
        active.find((leave) => (leave as { id: string }).id === id),
      ),
    );
  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(LINKED) },
    leaves: {
      listActiveFor: jest.fn().mockResolvedValue(active),
      cancel,
    },
  } as unknown as CommandDeps;

  return { deps, cancel };
}

describe('/huy-nghi-phep', () => {
  it('hủy lần nghỉ gần nhất (đang diễn ra hoặc sắp tới) và nêu khoảng ngày', async () => {
    const { deps, cancel } = makeDeps([
      { id: 'now', startDate: '2026-10-03', endDate: '2026-10-06' },
      { id: 'later', startDate: '2026-11-01', endDate: '2026-11-03' },
    ]);

    const reply = await huyNghiPhepCommand.execute(INTERACTION, deps);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith('now', ACTOR);
    expect(reply.data.content).toBe('Đã hủy lần nghỉ 03/10 - 06/10.');
  });

  it('báo khi không có lần nghỉ nào để hủy', async () => {
    const { deps, cancel } = makeDeps([]);

    const reply = await huyNghiPhepCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toBe('Bạn không có lần nghỉ nào để hủy.');
    expect(cancel).not.toHaveBeenCalled();
  });
});
