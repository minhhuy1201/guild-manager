import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { CommandDeps } from '../commands/command.types';
import { diemDanhHoCommand } from '../commands/diem-danh-ho.command';
import { MESSAGE_FLAG } from '../discord.constants';

const INTERACTION = {
  type: 2 as const,
  data: {
    name: 'diem-danh-ho',
    options: [{ name: 'nguoi', value: '999' }],
  },
  member: { user: { id: '111' } },
};

/**
 * Build deps for a caller of the given role pointing at a target.
 * @param options.callerRole - Role the caller acts with
 * @param options.target - What findByDiscordId returns for the mentioned user
 * @param options.targetRow - What findById returns for that character
 * @returns Stubbed deps
 */
function makeDeps(options: {
  callerRole: GuildRole;
  target: unknown;
  targetRow?: unknown;
}): CommandDeps {
  return {
    actors: {
      resolve: jest.fn().mockResolvedValue({
        actor: {
          sub: '111',
          role: options.callerRole,
          type: TOKEN_TYPE.access,
        },
        characterId: 'admin-abc123',
      }),
    },
    characters: {
      findByDiscordId: jest.fn().mockResolvedValue(options.target),
      findById: jest.fn().mockResolvedValue(options.targetRow ?? null),
    },
    battleSessions: { listByWeek: jest.fn().mockResolvedValue([]) },
    attendance: { getRecords: jest.fn().mockResolvedValue([]) },
  } as never;
}

describe('/diem-danh-ho', () => {
  it('khai báo một option USER bắt buộc tên nguoi', () => {
    // Sai tên option thì Discord gửi lên một mảng bot không đọc được, và lệnh im lặng hỏng.
    expect(diemDanhHoCommand.definition.options).toEqual([
      expect.objectContaining({ name: 'nguoi', type: 6, required: true }),
    ]);
  });

  it('admin thấy bảng của người được mention', async () => {
    const deps = makeDeps({
      callerRole: GuildRole.ADMIN,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      targetRow: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '999' },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('Mèo Béo');
  });

  it('bảng hiện công khai cho cả kênh, không phải riêng người gõ lệnh', async () => {
    // Tin ephemeral chỉ ĐÚNG MỘT người xem được, nên để người được điểm danh hộ thấy thì bắt buộc
    // phải công khai. Cờ ephemeral quay lại đây là hỏng đúng cái yêu cầu của tính năng.
    const deps = makeDeps({
      callerRole: GuildRole.ADMIN,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      targetRow: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '999' },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.flags).toBeUndefined();
  });

  it('nhắc tên người được điểm danh để họ nhận được thông báo', async () => {
    const deps = makeDeps({
      callerRole: GuildRole.ADMIN,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      targetRow: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '999' },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('<@999>');
  });

  it('lời từ chối vẫn riêng tư, cả kênh không cần xem ai bị nói không', async () => {
    const deps = makeDeps({
      callerRole: GuildRole.MEMBER,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('member bị từ chối trước khi thấy bảng', async () => {
    // AttendanceService chỉ từ chối lúc GHI. Bảng thì hiện ra trước đó, nên chỗ này phải chặn sớm.
    const deps = makeDeps({
      callerRole: GuildRole.MEMBER,
      target: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
    });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('Chỉ admin');
    expect(reply.data.components).toBeUndefined();
  });

  it('nói rõ khi người được mention chưa được gán nhân vật', async () => {
    const deps = makeDeps({ callerRole: GuildRole.ADMIN, target: null });

    const reply = await diemDanhHoCommand.execute(INTERACTION, deps);

    expect(reply.data.content).toContain('<@999>');
    expect(reply.data.content).toContain('chưa được gán nhân vật');
  });
});
