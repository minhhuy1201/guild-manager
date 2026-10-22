import {
  CAPABILITY_LABEL,
  Capability,
  GRANTABLE_COMMAND_LABEL,
  GUILD_ROLE_LABEL,
  GUILD_ROLE_OPTIONS,
  GrantableCommand,
  GuildRole,
} from '@guild/shared/enums';
import { can, canRunCommand } from '@guild/shared/lib';

describe('quyền theo vai', () => {
  it('có hai vai: quản trị và bang chúng', () => {
    expect(Object.values(GuildRole)).toEqual([
      GuildRole.ADMIN,
      GuildRole.MEMBER,
    ]);
    expect(GUILD_ROLE_OPTIONS).toEqual([GuildRole.MEMBER, GuildRole.ADMIN]);
    expect(Object.keys(GUILD_ROLE_LABEL)).toHaveLength(2);
  });

  it('có sáu Capability, nhãn theo đúng thứ tự hiển thị', () => {
    expect(Object.values(Capability)).toEqual([
      Capability.TEAM_BUILDER,
      Capability.SCHEDULE,
      Capability.MEMBERS,
      Capability.ATTENDANCE,
      Capability.CAT_RACE,
      Capability.TACTICS,
    ]);
    expect(Object.keys(CAPABILITY_LABEL)).toEqual(Object.values(Capability));
    expect(Object.values(CAPABILITY_LABEL)).toEqual([
      'Xếp team',
      'Lịch trận',
      'Thành viên',
      'Điểm danh & nghỉ phép',
      'Đua mèo',
      'Sửa chiến thuật',
    ]);
  });

  it('có năm command admin, nhãn là tên lệnh', () => {
    expect(Object.keys(GRANTABLE_COMMAND_LABEL)).toEqual(
      Object.values(GrantableCommand),
    );
    expect(Object.values(GRANTABLE_COMMAND_LABEL)).toEqual([
      '/diem-danh-ho',
      '/chao-mung',
      '/cau-hinh-kenh',
      '/thong-bao',
      '/nhac-diem-danh',
    ]);
  });
});

describe('can', () => {
  it.each(Object.values(Capability))(
    'ADMIN luôn được %s, kể cả khi không mang Grant nào',
    (capability) => {
      expect(can({ role: GuildRole.ADMIN }, capability)).toBe(true);
    },
  );

  it.each(Object.values(Capability))(
    'MEMBER không bao giờ được %s',
    (capability) => {
      expect(can({ role: GuildRole.MEMBER }, capability)).toBe(false);
    },
  );
});

describe('canRunCommand', () => {
  it.each(Object.values(GrantableCommand))(
    'ADMIN luôn chạy được %s',
    (command) => {
      expect(canRunCommand({ role: GuildRole.ADMIN }, command)).toBe(true);
    },
  );

  it.each(Object.values(GrantableCommand))(
    'MEMBER không bao giờ chạy được %s',
    (command) => {
      expect(canRunCommand({ role: GuildRole.MEMBER }, command)).toBe(false);
    },
  );
});
