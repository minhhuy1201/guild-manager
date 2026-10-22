import { describe, expect, it } from "vitest";
import { Capability, GuildRole } from "@guild/shared/enums";

import { SETTINGS_TAB } from "@/config/settings-capabilities";

import { grantedTabs, resolveTab } from "../settings-tabs";

const MANAGER = { role: GuildRole.MANAGER };

describe("grantedTabs", () => {
  it("Admin thấy cả ba tab, theo thứ tự hiển thị", () => {
    expect(grantedTabs({ role: GuildRole.ADMIN })).toEqual([
      SETTINGS_TAB.battles,
      SETTINGS_TAB.members,
      SETTINGS_TAB.leaves,
    ]);
  });

  it("Member không thấy tab nào", () => {
    expect(grantedTabs({ role: GuildRole.MEMBER })).toEqual([]);
  });

  it("Manager chưa có Grant nào không thấy tab nào", () => {
    expect(grantedTabs(MANAGER)).toEqual([]);
  });

  it("Manager chỉ thấy tab của Capability được cấp", () => {
    expect(
      grantedTabs({ ...MANAGER, capabilities: [Capability.ATTENDANCE] })
    ).toEqual([SETTINGS_TAB.leaves]);
    expect(
      grantedTabs({
        ...MANAGER,
        capabilities: [Capability.MEMBERS, Capability.SCHEDULE],
      })
    ).toEqual([SETTINGS_TAB.battles, SETTINGS_TAB.members]);
  });

  it("Capability không thuộc Thiết lập không mở tab nào", () => {
    expect(
      grantedTabs({
        ...MANAGER,
        capabilities: [Capability.TEAM_BUILDER, Capability.CAT_RACE],
      })
    ).toEqual([]);
  });
});

describe("resolveTab", () => {
  const ALL = [SETTINGS_TAB.battles, SETTINGS_TAB.members, SETTINGS_TAB.leaves];

  it("giữ tab được yêu cầu khi đã được cấp", () => {
    expect(resolveTab("members", ALL)).toBe(SETTINGS_TAB.members);
  });

  it("không có ?tab thì mở tab được cấp đầu tiên", () => {
    expect(resolveTab(null, ALL)).toBe(SETTINGS_TAB.battles);
    expect(resolveTab(null, [SETTINGS_TAB.members])).toBe(SETTINGS_TAB.members);
  });

  it("?tab trỏ vào tab không được cấp thì rơi về tab được cấp đầu tiên", () => {
    expect(resolveTab("battles", [SETTINGS_TAB.leaves])).toBe(
      SETTINGS_TAB.leaves
    );
    expect(
      resolveTab("leaves", [SETTINGS_TAB.battles, SETTINGS_TAB.members])
    ).toBe(SETTINGS_TAB.battles);
  });

  it("giá trị lạ thì mở tab được cấp đầu tiên", () => {
    expect(resolveTab("khong-co", [SETTINGS_TAB.members])).toBe(
      SETTINGS_TAB.members
    );
  });

  it("không tab nào được cấp thì không có tab để mở", () => {
    expect(resolveTab("members", [])).toBeNull();
  });
});
