import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { NOT_LINKED } from '../attendance-board';
import type { CommandDeps } from '../commands/command.types';
import { MESSAGE_FLAG } from '../discord.constants';
import { requireAdmin } from '../require-admin';

const INTERACTION = {
  type: 2 as const,
  channel_id: '424242',
  data: { name: 'thong-bao' },
  member: { user: { id: '111' } },
};

/** The sentence one command uses; every command passes its own. */
const ADMIN_ONLY = 'Chỉ admin mới đăng thông báo được.';

/**
 * Build deps whose resolver answers with the given caller.
 * @param resolved - What `ActorResolver.resolve` returns; null means the Discord ID has no access
 * @returns Deps holding only the resolver, which is all `requireAdmin` reads
 */
function makeDeps(resolved: unknown): CommandDeps {
  return {
    actors: { resolve: jest.fn().mockResolvedValue(resolved) },
  } as unknown as CommandDeps;
}

/**
 * A resolved caller of the given role.
 * @param role - Role the caller acts with
 * @returns The resolver's answer
 */
function caller(role: GuildRole) {
  return {
    actor: { sub: '111', role, type: TOKEN_TYPE.access },
    character: { id: 'char-abc123', name: 'Huy', discordId: '111' },
  };
}

describe('requireAdmin', () => {
  it('trả về caller đã resolve khi người gọi là admin', async () => {
    const resolved = caller(GuildRole.ADMIN);

    const check = await requireAdmin(
      INTERACTION,
      makeDeps(resolved),
      ADMIN_ONLY,
    );

    expect(check).toEqual({ ok: true, caller: resolved });
  });

  it('từ chối bằng NOT_LINKED khi Discord ID chưa gắn nhân vật', async () => {
    const check = await requireAdmin(INTERACTION, makeDeps(null), ADMIN_ONLY);

    expect(check.ok).toBe(false);
    if (check.ok) throw new Error('expected a refusal');
    expect(check.reply.data.content).toBe(NOT_LINKED);
    expect(check.reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('từ chối member bằng đúng câu của command đó', async () => {
    const check = await requireAdmin(
      INTERACTION,
      makeDeps(caller(GuildRole.MEMBER)),
      ADMIN_ONLY,
    );

    if (check.ok) throw new Error('expected a refusal');
    expect(check.reply.data.content).toBe(ADMIN_ONLY);
    expect(check.reply.data.flags).toBe(MESSAGE_FLAG.ephemeral);
  });

  it('kiểm tra liên kết trước quyền admin — người chưa gắn nhân vật không bị nói là thiếu quyền', async () => {
    const check = await requireAdmin(INTERACTION, makeDeps(null), ADMIN_ONLY);

    if (check.ok) throw new Error('expected a refusal');
    expect(check.reply.data.content).not.toBe(ADMIN_ONLY);
  });
});
