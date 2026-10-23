import { describe, expect, it } from "vitest";

import { decideAccess } from "../access";

describe("decideAccess", () => {
  it("khách chỉ vào được trang đăng nhập và trang giới thiệu", () => {
    expect(decideAccess({ pathname: "/dang-nhap", isSignedIn: false })).toBe(
      "allow"
    );
    expect(
      decideAccess({ pathname: "/dang-nhap/discord", isSignedIn: false })
    ).toBe("allow");
    expect(decideAccess({ pathname: "/xep-team", isSignedIn: false })).toBe(
      "login"
    );
  });

  // Typing the bare domain is how a stranger arrives, so that address gives them the landing page
  // rather than a login form for an app they know nothing about yet. Every other path is one
  // somebody typed deliberately.
  it("khách gõ trần tên miền thì được đưa sang trang giới thiệu", () => {
    expect(decideAccess({ pathname: "/", isSignedIn: false })).toBe("landing");
    expect(
      decideAccess({ pathname: "/lich-su-diem-danh", isSignedIn: false })
    ).toBe("login");
  });

  it("khách xem được trang giới thiệu", () => {
    expect(decideAccess({ pathname: "/trang-chu", isSignedIn: false })).toBe(
      "allow"
    );
    expect(decideAccess({ pathname: "/trang-chu", isSignedIn: true })).toBe(
      "allow"
    );
    expect(decideAccess({ pathname: "/trang-chu", isSignedIn: true })).toBe(
      "allow"
    );
  });

  // The public list matches whole segments: a bare `startsWith` would read `/trang-chu-cu` as part
  // of `/trang-chu` and make a page public by accident.
  it("danh sách công khai chỉ khớp trọn segment", () => {
    expect(decideAccess({ pathname: "/trang-chu-cu", isSignedIn: false })).toBe(
      "login"
    );
    expect(decideAccess({ pathname: "/dang-nhapx", isSignedIn: false })).toBe(
      "login"
    );
    // A genuinely nested route still matches.
    expect(
      decideAccess({ pathname: "/dang-nhap/discord", isSignedIn: false })
    ).toBe("allow");
  });

  // The token's role can be a day old, so the proxy no longer judges management routes by it: a
  // Member promoted to Manager would be turned away until the token refreshed. Every signed-in
  // user reaches the page, whose server component checks the Capability against /auth/me.
  it("người đã đăng nhập đi qua proxy ở mọi route quản lý, trang tự kiểm Capability", () => {
    for (const pathname of [
      "/xep-team",
      "/xep-team-v2",
      "/thiet-lap",
      "/dua-meo",
      "/dua-meo/abc",
    ]) {
      expect(decideAccess({ pathname, isSignedIn: true })).toBe("allow");
    }
  });

  it("proxy không xét vai trong token nên người vừa được nâng vai vẫn tới được trang", () => {
    expect(decideAccess({ pathname: "/thiet-lap", isSignedIn: true })).toBe(
      "allow"
    );
  });

  it("khách vẫn bị chuyển về login ở route quản lý", () => {
    for (const pathname of ["/xep-team", "/thiet-lap", "/dua-meo"]) {
      expect(decideAccess({ pathname, isSignedIn: false })).toBe("login");
    }
  });
});
