import {
  Capability,
  GrantableCommand,
  GuildClass,
  GuildRole,
} from '@guild/shared/enums';

import { toCharacter, toGuildMember } from '../characters.codec';

describe('toCharacter', () => {
  it('giữ nguyên id, tên và lưu phái', () => {
    expect(
      toCharacter({
        id: 'huy-a1',
        name: 'Huy',
        guildClass: GuildClass.THIET_Y,
      }),
    ).toEqual({ id: 'huy-a1', name: 'Huy', guildClass: GuildClass.THIET_Y });
  });

  it('không mang theo cột thừa của hàng Prisma', () => {
    const entity = toCharacter({
      id: 'huy-a1',
      name: 'Huy',
      guildClass: GuildClass.THIET_Y,
      // @ts-expect-error — a real row has extra columns; the codec must pick fields, not spread the row
      createdAt: new Date(),
    });

    expect(Object.keys(entity)).toEqual(['id', 'name', 'guildClass']);
  });

  it('ném khi lưu phái trong database không thuộc enum dùng chung', () => {
    expect(() =>
      toCharacter({ id: 'huy-a1', name: 'Huy', guildClass: 'PHAI_LA' }),
    ).toThrow();
  });
});

describe('toGuildMember', () => {
  const ROW = {
    id: 'huy-a1',
    name: 'Huy',
    guildClass: GuildClass.THIET_Y,
    discordId: null,
    discordUsername: null,
    discordAvatar: null,
    lastLoginAt: null,
    role: GuildRole.MANAGER,
    capabilities: [Capability.TACTICS],
    grantedCommands: [GrantableCommand.THONG_BAO],
  };

  it('mang vai và cả hai nhóm Grant ra màn quản lý', () => {
    expect(toGuildMember(ROW)).toMatchObject({
      role: GuildRole.MANAGER,
      capabilities: [Capability.TACTICS],
      grantedCommands: [GrantableCommand.THONG_BAO],
    });
  });

  it('ném khi Grant trong database không thuộc enum dùng chung', () => {
    expect(() =>
      toGuildMember({ ...ROW, capabilities: ['QUYEN_LA'] }),
    ).toThrow();
  });
});
