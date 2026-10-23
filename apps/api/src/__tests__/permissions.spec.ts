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
  it('có ba vai: ADMIN, Quản lý và bang chúng', () => {
    expect(Object.values(GuildRole)).toEqual([
      GuildRole.ADMIN,
      GuildRole.MANAGER,
      GuildRole.MEMBER,
    ]);
    expect(GUILD_ROLE_OPTIONS).toEqual([
      GuildRole.MEMBER,
      GuildRole.MANAGER,
      GuildRole.ADMIN,
    ]);
    expect(GUILD_ROLE_LABEL).toEqual({
      [GuildRole.ADMIN]: 'ADMIN',
      [GuildRole.MANAGER]: 'Quản lý',
      [GuildRole.MEMBER]: 'Bang chúng',
    });
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

describe('Manager', () => {
  const NO_GRANTS = { role: GuildRole.MANAGER };

  it.each(Object.values(Capability))(
    'chưa có Grant nào thì không được %s, như Member',
    (capability) => {
      expect(can(NO_GRANTS, capability)).toBe(false);
      expect(
        can(
          { role: GuildRole.MANAGER, capabilities: [], grantedCommands: [] },
          capability,
        ),
      ).toBe(false);
    },
  );

  it.each(Object.values(GrantableCommand))(
    'chưa có Grant nào thì không chạy được %s',
    (command) => {
      expect(canRunCommand(NO_GRANTS, command)).toBe(false);
    },
  );

  it('chỉ được đúng Capability đã cấp', () => {
    const actor = {
      role: GuildRole.MANAGER,
      capabilities: [Capability.TEAM_BUILDER, Capability.TACTICS],
    };

    expect(
      Object.values(Capability).filter((capability) => can(actor, capability)),
    ).toEqual([Capability.TEAM_BUILDER, Capability.TACTICS]);
  });

  it('chỉ chạy được đúng command đã cấp', () => {
    const actor = {
      role: GuildRole.MANAGER,
      grantedCommands: [GrantableCommand.THONG_BAO],
    };

    expect(
      Object.values(GrantableCommand).filter((command) =>
        canRunCommand(actor, command),
      ),
    ).toEqual([GrantableCommand.THONG_BAO]);
  });

  it('Grant command độc lập với Grant Capability, không cái nào mở cái kia', () => {
    const onlyCommand = {
      role: GuildRole.MANAGER,
      grantedCommands: [GrantableCommand.DIEM_DANH_HO],
    };
    const onlyCapability = {
      role: GuildRole.MANAGER,
      capabilities: [Capability.ATTENDANCE],
    };

    expect(canRunCommand(onlyCommand, GrantableCommand.DIEM_DANH_HO)).toBe(
      true,
    );
    expect(can(onlyCommand, Capability.ATTENDANCE)).toBe(false);
    expect(can(onlyCapability, Capability.ATTENDANCE)).toBe(true);
    expect(canRunCommand(onlyCapability, GrantableCommand.DIEM_DANH_HO)).toBe(
      false,
    );
  });

  it('Grant mang theo cũng không nâng Member lên', () => {
    const member = {
      role: GuildRole.MEMBER,
      capabilities: Object.values(Capability),
      grantedCommands: Object.values(GrantableCommand),
    };

    expect(Object.values(Capability).some((c) => can(member, c))).toBe(false);
    expect(
      Object.values(GrantableCommand).some((c) => canRunCommand(member, c)),
    ).toBe(false);
  });
});
