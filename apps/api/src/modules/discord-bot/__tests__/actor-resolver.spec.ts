import { GuildRole } from '@guild/shared/enums';

import { TOKEN_TYPE } from '../../../common';
import { ActorResolver } from '../actor-resolver';

/**
 * Build a resolver over stubbed collaborators.
 * @param options.member - What CharactersService.findByDiscordId returns
 * @param options.adminIds - Raw DISCORD_ADMIN_IDS value
 * @returns The resolver under test
 */
function makeResolver(options: {
  member: { id: string; role: GuildRole } | null;
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
    const resolver = makeResolver({
      member: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      adminIds: '',
    });

    await expect(resolver.resolve('111')).resolves.toEqual({
      actor: { sub: '111', role: GuildRole.MEMBER, type: TOKEN_TYPE.access },
      characterId: 'meo-beo-k7ma3x',
    });
  });

  it('danh sách cứu hộ thắng role trong database', async () => {
    const resolver = makeResolver({
      member: { id: 'meo-beo-k7ma3x', role: GuildRole.MEMBER },
      adminIds: '111',
    });

    const resolved = await resolver.resolve('111');

    expect(resolved?.actor.role).toBe(GuildRole.ADMIN);
  });

  it('admin cứu hộ không có nhân vật vẫn dùng bot được', async () => {
    const resolver = makeResolver({ member: null, adminIds: '111' });

    await expect(resolver.resolve('111')).resolves.toEqual({
      actor: { sub: '111', role: GuildRole.ADMIN, type: TOKEN_TYPE.access },
      characterId: null,
    });
  });

  it('trả null khi không có nhân vật và cũng không cứu hộ', async () => {
    // Người này chưa được admin gán discordId — bot phải nói đúng câu đó, không phải im lặng.
    const resolver = makeResolver({ member: null, adminIds: '999' });

    await expect(resolver.resolve('111')).resolves.toBeNull();
  });
});
