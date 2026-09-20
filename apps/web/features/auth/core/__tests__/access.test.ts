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

  // The admin list is the opposite, and keeps `startsWith` on purpose: matching too widely here
  // locks one door by mistake, while matching too narrowly leaves an admin route unguarded.
  it("danh sách quản trị khớp rộng, vì hỏng theo hướng an toàn", () => {
    expect(
      decideAccess({ pathname: "/xep-team-v2", role: GuildRole.MEMBER })
    ).toBe("home");
  });

  it("bang chúng không vào được route quản trị", () => {
    const role = GuildRole.MEMBER;

    expect(decideAccess({ pathname: "/xep-team", role })).toBe("home");
    expect(decideAccess({ pathname: "/thiet-lap", role })).toBe("home");
    expect(decideAccess({ pathname: "/", role })).toBe("allow");
  });

  it("quản trị viên vào được mọi route", () => {
    expect(decideAccess({ pathname: "/xep-team", role: GuildRole.ADMIN })).toBe(
      "allow"
    );
    expect(
      decideAccess({ pathname: "/thiet-lap", role: GuildRole.ADMIN })
    ).toBe("allow");
  });
});
