import { describe, expect, it } from "vitest";
import { GuildClass, GuildRole } from "@guild/shared/enums";
import type { GuildMember } from "@guild/shared/schemas";

import { isLastAdmin } from "../lib/last-admin";

/**
 * A member with the given id and role; the other fields never matter here.
 * @param id - Member id
 * @param role - Role the member holds
 * @returns The member
 */
function member(id: string, role: GuildRole): GuildMember {
  return {
    id,
    name: id,
    guildClass: GuildClass.THIET_Y,
    role,
    discordId: null,
    discordUsername: null,
    lastLoginAt: null,
  };
}

const ADMIN = member("a1", GuildRole.ADMIN);
const OTHER_ADMIN = member("a2", GuildRole.ADMIN);
const MEMBER = member("m1", GuildRole.MEMBER);

describe("isLastAdmin", () => {
  it("đúng khi bang chỉ còn đúng một quản trị viên", () => {
    expect(isLastAdmin([ADMIN, MEMBER], ADMIN)).toBe(true);
  });

  it("sai khi còn quản trị viên khác", () => {
    expect(isLastAdmin([ADMIN, OTHER_ADMIN], ADMIN)).toBe(false);
  });

  it("sai với người không phải quản trị viên", () => {
    // Kể cả trong bang không có quản trị viên nào - xoá một bang chúng không bao giờ bị chặn.
    expect(isLastAdmin([MEMBER], MEMBER)).toBe(false);
  });

  it("sai khi danh sách chưa tải xong", () => {
    // Chưa có dữ liệu thì không được đoán là bị khoá: chốt chặn thật nằm ở API.
    expect(isLastAdmin([], ADMIN)).toBe(false);
  });
});
