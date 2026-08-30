import { describe, expect, it } from "vitest";
import { GuildRole } from "@guild/shared/enums";

import { decideAccess } from "../access";

describe("decideAccess", () => {
  it("khách chỉ vào được trang đăng nhập", () => {
    expect(decideAccess({ pathname: "/dang-nhap", role: null })).toBe("allow");
    expect(decideAccess({ pathname: "/dang-nhap/discord", role: null })).toBe(
      "allow"
    );
    expect(decideAccess({ pathname: "/", role: null })).toBe("login");
    expect(decideAccess({ pathname: "/xep-team", role: null })).toBe("login");
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
