import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { cauHinhKenhCommand } from '../commands/cau-hinh-kenh.command';
import { chaoMungCommand } from '../commands/chao-mung.command';
import { diemDanhHoCommand } from '../commands/diem-danh-ho.command';
import { diemDanhCommand } from '../commands/diem-danh.command';
import { nhacDiemDanhCommand } from '../commands/nhac-diem-danh.command';
import { pingCommand } from '../commands/ping.command';
import { thongBaoCommand } from '../commands/thong-bao.command';
import type { CommandDeps, SlashCommand } from '../commands/command.types';
import { NOT_LINKED } from '../attendance-board';
import { MESSAGE_FLAG } from '../discord.constants';
import { NOT_GRANTED } from '../require-command';

/** Each admin command with the Grant that opens it. */
const ADMIN_COMMANDS: [string, SlashCommand, GrantableCommand][] = [
  ['/diem-danh-ho', diemDanhHoCommand, GrantableCommand.DIEM_DANH_HO],
  ['/chao-mung', chaoMungCommand, GrantableCommand.CHAO_MUNG],
  ['/cau-hinh-kenh', cauHinhKenhCommand, GrantableCommand.CAU_HINH_KENH],
  ['/thong-bao', thongBaoCommand, GrantableCommand.THONG_BAO],
  ['/nhac-diem-danh', nhacDiemDanhCommand, GrantableCommand.NHAC_DIEM_DANH],
];

/**
 * An invocation of a command.
 * @param command - The command being run
 * @returns A validated-looking interaction with the options a command may read
 */
function invocationOf(command: SlashCommand) {
  return {
    type: 2 as const,
    channel_id: '424242',
    data: {
      name: command.definition.name,
      options: [
        { name: 'nguoi', value: '999' },
        { name: 'muc-dich', value: 'GENERAL_NOTI' },
      ],
    },
    member: { user: { id: '111' } },
  };
}

/**
 * Deps whose resolver answers with the given caller. Everything else is absent on purpose: a
 * command that passes the gate and reaches a service throws, which the tests read as "got through".
 * @param resolved - What ActorResolver.resolve returns
 * @returns The deps
 */
function depsFor(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
  } as unknown as CommandDeps;
}

/**
 * A resolved caller.
 * @param role - Role the caller acts with
 * @param grants - Grants a Manager carries
 * @returns The resolver's answer
 */
function caller(
  role: GuildRole,
  grants: {
    capabilities?: Capability[];
    grantedCommands?: GrantableCommand[];
  } = {},
) {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access, ...grants },
    character: { id: 'meo-beo-k7ma3x', name: 'Mèo Béo', discordId: '111' },
  };
}

/**
 * Run a command and say what the caller was told.
 * @param command - The command
 * @param resolved - The caller the resolver finds, null when unlinked
 * @returns The reply content, or 'proceeded' when the command went past the gate into a service
 */
async function outcomeOf(
  command: SlashCommand,
  resolved: unknown,
): Promise<{ content: string; flags?: number }> {
  try {
    const reply = await command.execute(
      invocationOf(command),
      depsFor(resolved),
    );

    return { content: reply.data.content ?? '', flags: reply.data.flags };
  } catch {
    // Reaching a service the test left undefined throws: the gate let the caller through.
    return { content: 'proceeded' };
  }
}

describe.each(ADMIN_COMMANDS)('%s', (_name, command, grant) => {
  it('Admin chạy được', async () => {
    const outcome = await outcomeOf(command, caller(GuildRole.ADMIN));

    expect(outcome.content).not.toBe(NOT_GRANTED);
    expect(outcome.content).not.toBe(NOT_LINKED);
  });

  it('Quản lý được cấp đúng command này chạy được, không cần Capability nào', async () => {
    const outcome = await outcomeOf(
      command,
      caller(GuildRole.MANAGER, { grantedCommands: [grant] }),
    );

    expect(outcome.content).not.toBe(NOT_GRANTED);
    expect(outcome.content).not.toBe(NOT_LINKED);
  });

  it('Quản lý chưa được tick nhận câu từ chối chung, chỉ mình họ thấy', async () => {
    const outcome = await outcomeOf(command, caller(GuildRole.MANAGER));

    expect(outcome).toEqual({
      content: NOT_GRANTED,
      flags: MESSAGE_FLAG.ephemeral,
    });
  });

  it('Quản lý chỉ được cấp command khác, hay chỉ có Capability, bị từ chối', async () => {
    const others = Object.values(GrantableCommand).filter(
      (other) => other !== grant,
    );

    for (const grants of [
      { grantedCommands: others },
      { capabilities: Object.values(Capability) },
    ]) {
      expect(
        await outcomeOf(command, caller(GuildRole.MANAGER, grants)),
      ).toMatchObject({ content: NOT_GRANTED });
    }
  });

  it('Member nhận đúng câu từ chối của Quản lý chưa được cấp', async () => {
    const member = await outcomeOf(command, caller(GuildRole.MEMBER));
    const manager = await outcomeOf(command, caller(GuildRole.MANAGER));

    expect(member).toEqual(manager);
    expect(member.content).toBe(NOT_GRANTED);
  });

  it('người chưa liên kết nhân vật nhận câu chưa liên kết, đi trước câu từ chối', async () => {
    expect(await outcomeOf(command, null)).toEqual({
      content: NOT_LINKED,
      flags: MESSAGE_FLAG.ephemeral,
    });
  });
});

describe('command mở cho mọi người', () => {
  it.each([
    ['/ping', pingCommand],
    ['/diem-danh', diemDanhCommand],
  ])('%s không bao giờ trả câu từ chối quyền', async (_name, command) => {
    for (const resolved of [
      caller(GuildRole.MEMBER),
      caller(GuildRole.MANAGER),
      caller(GuildRole.ADMIN),
    ]) {
      const outcome = await outcomeOf(command, resolved);

      expect(outcome.content).not.toBe(NOT_GRANTED);
    }
  });
});
