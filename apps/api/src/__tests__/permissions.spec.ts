import {
  GUILD_ROLE_LABEL,
  GUILD_ROLE_OPTIONS,
  GuildRole,
} from '@guild/shared/enums';
import { canManageGuild } from '@guild/shared/lib';

describe('quyền theo vai', () => {
  it('chỉ có hai vai: quản trị và bang chúng', () => {
    expect(Object.values(GuildRole)).toEqual([
      GuildRole.ADMIN,
      GuildRole.MEMBER,
    ]);
    expect(GUILD_ROLE_OPTIONS).toEqual([GuildRole.MEMBER, GuildRole.ADMIN]);
    expect(Object.keys(GUILD_ROLE_LABEL)).toHaveLength(2);
  });

  it('chỉ ADMIN được quản trị bang và xem điểm danh cả bang', () => {
    expect(canManageGuild(GuildRole.MEMBER)).toBe(false);
    expect(canManageGuild(GuildRole.ADMIN)).toBe(true);
  });
});
