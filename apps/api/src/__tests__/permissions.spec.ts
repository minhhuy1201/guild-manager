import { GuildRole } from '@guild/shared/enums';
import { canManageGuild, canViewAllAttendance } from '@guild/shared/lib';

describe('quyền theo vai', () => {
  it('chỉ MEMBER không được xem điểm danh cả bang', () => {
    expect(canViewAllAttendance(GuildRole.MEMBER)).toBe(false);
    expect(canViewAllAttendance(GuildRole.LEADER)).toBe(true);
    expect(canViewAllAttendance(GuildRole.ADMIN)).toBe(true);
  });

  it('chỉ ADMIN được quản trị bang', () => {
    expect(canManageGuild(GuildRole.MEMBER)).toBe(false);
    expect(canManageGuild(GuildRole.LEADER)).toBe(false);
    expect(canManageGuild(GuildRole.ADMIN)).toBe(true);
  });
});
