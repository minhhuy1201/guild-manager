import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { nhacDiemDanhCommand } from '../commands/nhac-diem-danh.command';
import { MESSAGE_FLAG } from '../discord.constants';
import { DiscordApiError } from '../discord-rest';
import type { ReminderOutcome } from '../reminder.service';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'nhac-diem-danh' },
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
    character: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '111' },
  };
}

/**
 * Build deps around one resolved actor and one reminder outcome.
 *
 * No `channels` stub: the command reads nothing of its own any more — every branch of its reply
 * comes from the outcome `run` reports.
 *
 * @param resolved - What ActorResolver.resolve returns
 * @param outcome - What ReminderService.run resolves to
 * @returns Stubbed deps plus the `run` mock, for assertions
 */
function makeDeps(resolved: unknown, outcome: ReminderOutcome) {
  const run = jest.fn().mockResolvedValue(outcome);

  const deps = {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
    reminders: { run },
  } as never as CommandDeps;

  return { deps, run };
}

describe('/nhac-diem-danh', () => {
  it('báo đã nhắc bao nhiêu người cho bao nhiêu ngày', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'sent',
      sessionCount: 2,
      missingCount: 5,
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('5');
    expect(reply.data.content).toContain('2');
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('không chọn phạm vi thì chạy đúng luật của cron', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).toHaveBeenCalledWith('today');
  });

  it('chọn cả tuần thì chạy phạm vi cả tuần', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    await nhacDiemDanhCommand.execute(
      {
        ...INTERACTION,
        data: {
          name: 'nhac-diem-danh',
          options: [{ name: 'pham-vi', value: 'week' }],
        },
      },
      deps,
    );

    expect(run).toHaveBeenCalledWith('week');
  });

  // Discord only sends values from choices, so an unknown value means the registered definition has
  // drifted from this build.
  it('giá trị phạm vi lạ thì báo lỗi và không nhắc ai', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    await expect(
      nhacDiemDanhCommand.execute(
        {
          ...INTERACTION,
          data: {
            name: 'nhac-diem-danh',
            options: [{ name: 'pham-vi', value: 'month' }],
          },
        },
        deps,
      ),
    ).rejects.toThrow('pham-vi');
    expect(run).not.toHaveBeenCalled();
  });

  it('hôm nay không có gì để nhắc thì gợi ý phạm vi cả tuần', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('Cả tuần');
  });

  it('nói rõ khi không còn ai thiếu', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('đủ');
  });

  it('chỉ đường khi chưa cấu hình channel', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'no-channel',
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('/cau-hinh-kenh');
  });

  it('thành viên thường bị từ chối và không chạy gì', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.MEMBER), {
      status: 'nothing-due',
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).not.toHaveBeenCalled();
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('Discord ID không gán với ai thì bị từ chối', async () => {
    const { deps, run } = makeDeps(null, { status: 'nothing-due' });

    await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).not.toHaveBeenCalled();
  });

  it('Discord từ chối vì thiếu quyền thì nói phải làm gì', async () => {
    // The same 403 that /cau-hinh-kenh and formation-announcer already translate. Here it used to
    // escape as a generic "Có lỗi xảy ra..." with no way for an admin to learn why.
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });
    run.mockRejectedValue(
      new DiscordApiError(403, '424242', 'Missing Permissions'),
    );

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('quyền');
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('lỗi khác của Discord vẫn nổi lên nguyên trạng', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });
    run.mockRejectedValue(
      new DiscordApiError(500, '424242', 'Internal Server Error'),
    );

    await expect(
      nhacDiemDanhCommand.execute(INTERACTION, deps),
    ).rejects.toThrow(DiscordApiError);
  });
});
