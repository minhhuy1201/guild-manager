import { describe, expect, it } from "vitest";
import { GuildClass, GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import { memberAccess } from "../lib/member-access";

/**
 * A member in the given role; the other fields never matter here.
 * @param role - Role the member holds
 * @returns The member
 */
function memberWith(role: GuildRole): GuildMember {
  return {
    id: "m1",
    name: "Mèo Mập",
    guildClass: GuildClass.THIET_Y,
    role,
    discordId: null,
    discordUsername: null,
    lastLoginAt: null,
    capabilities: [],
    grantedCommands: [],
  };
}

describe("memberAccess", () => {
  it.each(Object.values(GuildRole))("Admin sửa và xoá được hàng %s", (role) => {
    expect(memberAccess(GuildRole.ADMIN, memberWith(role))).toEqual({
      canEdit: true,
      canDelete: true,
    });
  });

  it("Quản lý sửa được hàng Member nhưng không xoá được", () => {
    expect(
      memberAccess(GuildRole.MANAGER, memberWith(GuildRole.MEMBER))
    ).toEqual({
      canEdit: true,
      canDelete: false,
    });
  });

  it.each([GuildRole.MANAGER, GuildRole.ADMIN])(
    "Quản lý chỉ xem được hàng %s",
    (role) => {
      expect(memberAccess(GuildRole.MANAGER, memberWith(role))).toEqual({
        canEdit: false,
        canDelete: false,
      });
    }
  );

  it("chưa biết vai người xem thì chỉ xem, không hiện nút ghi nào", () => {
    expect(memberAccess(undefined, memberWith(GuildRole.MEMBER))).toEqual({
      canEdit: false,
      canDelete: false,
    });
  });

  it("Member không ghi được gì", () => {
    expect(
      memberAccess(GuildRole.MEMBER, memberWith(GuildRole.MEMBER))
    ).toEqual({
      canEdit: false,
      canDelete: false,
    });
  });
});
