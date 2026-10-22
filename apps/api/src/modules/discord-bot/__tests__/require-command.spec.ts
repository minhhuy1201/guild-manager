import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { NOT_LINKED } from '../attendance-board';
import type { CommandDeps } from '../commands/command.types';
import { MESSAGE_FLAG } from '../discord.constants';
import { NOT_GRANTED, requireCommand } from '../require-command';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'thong-bao' },
  member: { user: { id: '111' } },
};

/** The command under test; every command passes its own. */
const COMMAND = GrantableCommand.THONG_BAO;

/**
 * Build deps whose resolver answers with the given caller.
 * @param resolved - What `ActorResolver.resolve` returns; null means the Discord ID has no access
 * @returns Deps holding only the resolver, which is all `requireCommand` reads
 */
function makeDeps(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
  } as unknown as CommandDeps;
}

/**
 * A resolved caller of the given role.
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
    character: { id: 'char-abc123', name: 'Huy', discordId: '111' },
  };
}

describe('requireCommand', () => {
  it('trả về caller đã resolve khi người gọi là admin', async () => {
    const resolved = caller(GuildRole.ADMIN);

    const check = await requireCommand(
      INTERACTION,
      makeDeps(resolved),
      COMMAND,
    );

    expect(check).toEqual({ ok: true, caller: resolved });
  });

  it('từ chối bằng NOT_LINKED khi Discord ID chưa gắn nhân vật', async () => {
    const check = await requireCommand(INTERACTION, makeDeps(null), COMMAND);

    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('expected a refusal');
    expect(check.reply.data.content).toBe(NOT_LINKED);
    expect(check.reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('từ chối member bằng câu chung, không nêu tên command', async () => {
    const check = await requireCommand(
      INTERACTION,
      makeDeps(caller(GuildRole.MEMBER)),
      COMMAND,
    );

    if (check.ok) throw new Error('expected a refusal');
    expect(check.reply.data.content).toBe(NOT_GRANTED);
    expect(check.reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('kiểm tra liên kết trước quyền admin — người chưa gắn nhân vật không bị nói là thiếu quyền', async () => {
    const check = await requireCommand(INTERACTION, makeDeps(null), COMMAND);

    if (check.ok) throw new Error('expected a refusal');
    expect(check.reply.data.content).not.toBe(NOT_GRANTED);
  });

  it('cho Quản lý được cấp đúng command này đi qua', async () => {
    const resolved = caller(GuildRole.MANAGER, {
      grantedCommands: [GrantableCommand.THONG_BAO],
    });

    const check = await requireCommand(
      INTERACTION,
      makeDeps(resolved),
      COMMAND,
    );

    expect(check).toEqual({ ok: true, caller: resolved });
  });

  it.each([
    ['chưa được cấp gì', {}],
    [
      'chỉ được cấp command khác',
      { grantedCommands: [GrantableCommand.CHAO_MUNG] },
    ],
    [
      'có mọi Capability nhưng không có Grant command',
      { capabilities: Object.values(Capability) },
    ],
  ])('từ chối Quản lý %s bằng cùng câu với Member', async (_name, grants) => {
    const manager = await requireCommand(
      INTERACTION,
      makeDeps(caller(GuildRole.MANAGER, grants)),
      COMMAND,
    );
    const member = await requireCommand(
      INTERACTION,
      makeDeps(caller(GuildRole.MEMBER)),
      COMMAND,
    );

    if (manager.ok || member.ok) throw new Error('expected a refusal');
    expect(manager.reply).toEqual(member.reply);
    expect(manager.reply.data.content).toBe(NOT_GRANTED);
    expect(manager.reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });
});
