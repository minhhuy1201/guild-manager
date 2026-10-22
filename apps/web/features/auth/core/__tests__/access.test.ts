import { describe, expect, it } from "vitest";
import { GuildRole } from "@guild/shared/enums";

import { decideAccess } from "../access";

describe("decideAccess", () => {
  it("khách chỉ vào được trang đăng nhập và trang giới thiệu", () => {
    expect(decideAccess({ pathname: "/dang-nhap", role: null })).toBe("allow");
    expect(decideAccess({ pathname: "/dang-nhap/discord", role: null })).toBe(
      "allow"
    );
    expect(decideAccess({ pathname: "/xep-team", role: null })).toBe("login");
  });

  // Typing the bare domain is how a stranger arrives, so that address gives them the landing page
  // rather than a login form for an app they know nothing about yet. Every other path is one
  // somebody typed deliberately.
  it("khách gõ trần tên miền thì được đưa sang trang giới thiệu", () => {
    expect(decideAccess({ pathname: "/", role: null })).toBe("landing");
    expect(decideAccess({ pathname: "/lich-su-diem-danh", role: null })).toBe(
      "login"
    );
  });

  it("khách xem được trang giới thiệu", () => {
    expect(decideAccess({ pathname: "/trang-chu", role: null })).toBe("allow");
    expect(
      decideAccess({ pathname: "/trang-chu", role: GuildRole.MEMBER })
    ).toBe("allow");
    expect(
      decideAccess({ pathname: "/trang-chu", role: GuildRole.ADMIN })
    ).toBe("allow");
  });

  // The public list matches whole segments: a bare `startsWith` would read `/trang-chu-cu` as part
  // of `/trang-chu` and make a page public by accident.
  it("danh sách công khai chỉ khớp trọn segment", () => {
    expect(decideAccess({ pathname: "/trang-chu-cu", role: null })).toBe(
      "login"
    );
    expect(decideAccess({ pathname: "/dang-nhapx", role: null })).toBe("login");
    // A genuinely nested route still matches.
    expect(decideAccess({ pathname: "/dang-nhap/discord", role: null })).toBe(
      "allow"
    );
  });

  // The token's role can be a day old, so the proxy no longer judges management routes by it: a
  // Member promoted to Manager would be turned away until the token refreshed. Every signed-in
  // user reaches the page, whose server component checks the Capability against /auth/me.
  it.each(Object.values(GuildRole))(
    "%s đã đăng nhập đi qua proxy ở mọi route quản lý, trang tự kiểm Capability",
    (role) => {
      for (const pathname of [
        "/xep-team",
        "/xep-team-v2",
        "/thiet-lap",
        "/dua-meo",
        "/dua-meo/abc",
      ]) {
        expect(decideAccess({ pathname, role })).toBe("allow");
      }
    }
  );

  it("bang chúng vào được route quản lý để trang xét vai mới nhất thay vì vai trong token", () => {
    expect(decideAccess({ pathname: "/thiet-lap", role: GuildRole.MEMBER })).toBe(
      "allow"
    );
  });

  it("khách vẫn bị chuyển về login ở route quản lý", () => {
    for (const pathname of ["/xep-team", "/thiet-lap", "/dua-meo"]) {
      expect(decideAccess({ pathname, role: null })).toBe("login");
    }
  });
});
