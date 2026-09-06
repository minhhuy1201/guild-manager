import { GuildClass, GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import type { GuildMemberRow } from '../../characters/characters.public';
import { ActorResolver } from '../actor-resolver';

/** A Character row as `findByDiscordId` now returns it. */
const ROW: GuildMemberRow = {
  id: 'meo-beo-k7ma3x',
  name: 'Mèo Béo',
  guildClass: GuildClass.CUU_LINH,
  discordId: '111',
  discordUsername: 'meobeo',
  discordAvatar: null,
  lastLoginAt: null,
  role: GuildRole.MEMBER,
};

/**
 * Build a resolver over stubbed collaborators.
 * @param options.member - What CharactersService.findByDiscordId returns
 * @param options.adminIds - Raw DISCORD_ADMIN_IDS value
 * @returns The resolver under test
 */
function makeResolver(options: {
  member: GuildMemberRow | null;
  adminIds: string;
}): ActorResolver {
  const characters = {
    findByDiscordId: jest.fn().mockResolvedValue(options.member),
  };
  const config = { get: jest.fn().mockReturnValue(options.adminIds) };

  return new ActorResolver(characters as never, config as never);
}

describe('ActorResolver', () => {
  it('dựng actor từ nhân vật đã được gán', async () => {
    const resolver = makeResolver({ member: ROW, adminIds: '' });

    // The whole row, not just the id: every caller needed the name and the Discord ID too, and was
    // reading the same row again to get them.
    await expect(resolver.resolve('111')).resolves.toEqual({
      actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
      character: ROW,
    });
  });

  it('danh sách cứu hộ thắng role trong database', async () => {
    const resolver = makeResolver({ member: ROW, adminIds: '111' });

    const resolved = await resolver.resolve('111');

    expect(resolved?.actor.role).toBe(GuildRole.ADMIN);
  });

  it('admin cứu hộ không có nhân vật vẫn dùng bot được', async () => {
    const resolver = makeResolver({ member: null, adminIds: '111' });

    await expect(resolver.resolve('111')).resolves.toEqual({
      actor: { sub: '111', role: GuildRole.ADMIN, type: TOKEN_TYPE.access },
      character: null,
    });
  });

  it('trả null khi không có nhân vật và cũng không cứu hộ', async () => {
    // Người này chưa được admin gán discordId — bot phải nói đúng câu đó, không phải im lặng.
    const resolver = makeResolver({ member: null, adminIds: '999' });

    await expect(resolver.resolve('111')).resolves.toBeNull();
  });
});
