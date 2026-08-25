import { GuildClass } from '@guild/shared/enums';

import { toCharacter } from '../characters.codec';

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
