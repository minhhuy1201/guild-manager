import { Capability, GrantableCommand, GuildRole } from '@guild/shared/enums';

import { ActorLookupService } from '../actor-lookup.service';

/** A Discord ID on the rescue list of the fake config below. */
const RESCUE_ID = '999888777666555444';

/**
 * Build the service over a fake member table.
 * @param row - What `findByDiscordId` returns
 * @returns The service
 */
function makeService(row: unknown): ActorLookupService {
  const characters = { findByDiscordId: jest.fn().mockResolvedValue(row) };
  const config = { get: () => RESCUE_ID };

  return new ActorLookupService(characters as never, config as never);
}

/**
 * A member row in the given role.
 * @param role - Role stored on the row
 * @returns The row
 */
function rowWith(role: GuildRole) {
  return {
    role,
    capabilities: [Capability.SCHEDULE],
    grantedCommands: [GrantableCommand.THONG_BAO],
  };
}

describe('ActorLookupService.current', () => {
  it('Quản lý mang Grant lưu trên hàng', async () => {
    await expect(
      makeService(rowWith(GuildRole.MANAGER)).current('111'),
    ).resolves.toEqual({
      role: GuildRole.MANAGER,
      capabilities: [Capability.SCHEDULE],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it.each([GuildRole.ADMIN, GuildRole.MEMBER])(
    '%s không mang Grant nào dù hàng còn danh sách cũ',
    async (role) => {
      await expect(makeService(rowWith(role)).current('111')).resolves.toEqual({
        role,
        capabilities: [],
        grantedCommands: [],
      });
    },
  );

  it('Admin cứu hộ không có hàng vẫn là Admin', async () => {
    await expect(makeService(null).current(RESCUE_ID)).resolves.toEqual({
      role: GuildRole.ADMIN,
      capabilities: [],
      grantedCommands: [],
    });
  });

  it('Admin cứu hộ mà hàng là Quản lý vẫn là Admin, danh sách rescue thắng database', async () => {
    const lookup = makeService(rowWith(GuildRole.MANAGER));

    await expect(lookup.current(RESCUE_ID)).resolves.toMatchObject({
      role: GuildRole.ADMIN,
      capabilities: [],
    });
  });

  it('không còn hàng và không phải ID cứu hộ thì chỉ còn là Member không Grant', async () => {
    // A person who left the guild: their old Admin or Manager token is not honoured.
    await expect(makeService(null).current('111')).resolves.toEqual({
      role: GuildRole.MEMBER,
      capabilities: [],
      grantedCommands: [],
    });
  });
});

describe('ActorLookupService.resolve', () => {
  it('trả hàng thành viên cùng vai và Grant, để login và bot dùng chung một lần đọc', async () => {
    const row = rowWith(GuildRole.MANAGER);

    await expect(makeService(row).resolve('111')).resolves.toEqual({
      member: row,
      role: GuildRole.MANAGER,
      grants: {
        capabilities: [Capability.SCHEDULE],
        grantedCommands: [GrantableCommand.THONG_BAO],
      },
    });
  });

  it('ID cứu hộ không có hàng vẫn có danh tính ADMIN, không có nhân vật', async () => {
    await expect(makeService(null).resolve(RESCUE_ID)).resolves.toEqual({
      member: null,
      role: GuildRole.ADMIN,
      grants: { capabilities: [], grantedCommands: [] },
    });
  });

  it('không có hàng và không phải ID cứu hộ thì không có danh tính', async () => {
    await expect(makeService(null).resolve('111')).resolves.toBeNull();
  });
});
