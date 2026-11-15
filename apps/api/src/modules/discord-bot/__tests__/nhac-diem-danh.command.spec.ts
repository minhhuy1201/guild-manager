import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps, MessagePayload } from '../commands/command.types';
import { nhacDiemDanhCommand } from '../commands/nhac-diem-danh.command';
import { INTERACTION_RESPONSE_TYPE, MESSAGE_FLAG } from '../discord.constants';
import type { ReminderOutcome } from '../reminder.service';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  application_id: '777',
  token: 'interaction-token',
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

/**
 * Run the command and its background work the way the router does.
 * @param deps - Stubbed deps
 * @param interaction - The invocation
 * @returns The message that replaces the "thinking" state
 */
async function finalMessage(
  deps: CommandDeps,
  interaction: Parameters<typeof nhacDiemDanhCommand.execute>[0] = INTERACTION,
): Promise<MessagePayload> {
  const reply = await nhacDiemDanhCommand.execute(interaction, deps);

  if (
    reply.type !== INTERACTION_RESPONSE_TYPE.deferredChannelMessageWithSource
  ) {
    throw new Error('expected a deferred reply');
  }

  return reply.followUp();
}

describe('/nhac-diem-danh', () => {
  it('được phép thì trả type 5 ephemeral và chưa nhắc ai trước khi Discord nhận trả lời', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(reply.type).toBe(
      INTERACTION_RESPONSE_TYPE.deferredChannelMessageWithSource,
    );
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
    expect(run).not.toHaveBeenCalled();
  });

  it('báo đã nhắc bao nhiêu người cho bao nhiêu ngày', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'sent',
      sessionCount: 2,
      missingCount: 5,
      deliveredCount: 4,
      unlinked: [],
      blocked: [],
      unsent: [],
    });

    const message = await finalMessage(deps);

    expect(message.content).toBe('Đã nhắc 4/5 người cho 2 ngày đánh.');
  });

  it('không chọn phạm vi thì chạy đúng luật của cron', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    await finalMessage(deps);

    expect(run).toHaveBeenCalledWith('today');
  });

  it('chọn cả tuần thì chạy phạm vi cả tuần', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    await finalMessage(deps, {
      ...INTERACTION,
      data: {
        name: 'nhac-diem-danh',
        options: [{ name: 'pham-vi', value: 'week' }],
      },
    });

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

    const message = await finalMessage(deps);

    expect(message.content).toContain('Cả tuần');
  });

  it('nói rõ khi không còn ai thiếu', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'nothing-due',
    });

    const message = await finalMessage(deps);

    expect(message.content).toContain('đủ');
  });

  it('nêu tên ba nhóm không nhận được', async () => {
    const { deps } = makeDeps(actor(GuildRole.ADMIN), {
      status: 'sent',
      sessionCount: 1,
      missingCount: 4,
      deliveredCount: 1,
      unlinked: ['Chim Sẻ'],
      blocked: ['Cún Con'],
      unsent: ['Mèo Béo'],
    });

    const message = await finalMessage(deps);

    expect(message.content).toContain('Chim Sẻ');
    expect(message.content).toContain('Cún Con');
    expect(message.content).toContain('Mèo Béo');
  });

  it('thành viên thường bị từ chối và không chạy gì', async () => {
    const { deps, run } = makeDeps(actor(GuildRole.MEMBER), {
      status: 'nothing-due',
    });

    const reply = await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).not.toHaveBeenCalled();
    expect(reply.type).toBe(INTERACTION_RESPONSE_TYPE.channelMessageWithSource);
    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('Discord ID không gán với ai thì bị từ chối', async () => {
    const { deps, run } = makeDeps(null, { status: 'nothing-due' });

    await nhacDiemDanhCommand.execute(INTERACTION, deps);

    expect(run).not.toHaveBeenCalled();
  });
});
