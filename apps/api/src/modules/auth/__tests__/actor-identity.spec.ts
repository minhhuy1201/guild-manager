import { GuildRole } from '@guild/shared/enums';

import { isRescueAdmin, resolveGuildRole } from '../actor-identity';

describe('isRescueAdmin', () => {
  it('nhận ra ID nằm trong danh sách', () => {
    expect(isRescueAdmin('123', '123,456')).toBe(true);
  });

  it('bỏ qua khoảng trắng quanh mỗi ID', () => {
    expect(isRescueAdmin('456', ' 123 , 456 ')).toBe(true);
  });

  it('danh sách rỗng thì không ai là admin cứu hộ', () => {
    // Chuỗi rỗng tách ra thành [''] — nếu không lọc, một discordId rỗng sẽ khớp.
    expect(isRescueAdmin('', '')).toBe(false);
    expect(isRescueAdmin('123', '')).toBe(false);
  });

  it('không khớp một phần của ID', () => {
    expect(isRescueAdmin('12', '123')).toBe(false);
  });
});

describe('resolveGuildRole', () => {
  it('danh sách cứu hộ thắng giá trị trong database', () => {
    // Một admin không được tự khoá mình ra ngoài vì role trong DB bị sửa nhầm.
    expect(
      resolveGuildRole({ isRescue: true, memberRole: GuildRole.MEMBER }),
    ).toBe(GuildRole.ADMIN);
  });

  it('không cứu hộ thì lấy role của nhân vật', () => {
    expect(
      resolveGuildRole({ isRescue: false, memberRole: GuildRole.ADMIN }),
    ).toBe(GuildRole.ADMIN);
  });

  it('không cứu hộ và không có nhân vật thì là MEMBER', () => {
    expect(resolveGuildRole({ isRescue: false, memberRole: null })).toBe(
      GuildRole.MEMBER,
    );
  });
});
