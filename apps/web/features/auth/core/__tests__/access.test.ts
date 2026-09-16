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

  // Gõ trần tên miền là cách người lạ tới đây, nên chỗ đó cho họ trang giới thiệu chứ không phải
  // một form đăng nhập của ứng dụng họ chưa biết là gì. Mọi đường khác đều do người ta chủ động gõ.
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

  // Danh sách công khai khớp trọn segment: `startsWith` trần sẽ coi `/trang-chu-cu` là một phần của
  // `/trang-chu` và vô tình mở công khai một trang.
  it("danh sách công khai chỉ khớp trọn segment", () => {
    expect(decideAccess({ pathname: "/trang-chu-cu", role: null })).toBe(
      "login"
    );
    expect(decideAccess({ pathname: "/dang-nhapx", role: null })).toBe("login");
    // Route lồng thật thì vẫn khớp.
    expect(decideAccess({ pathname: "/dang-nhap/discord", role: null })).toBe(
      "allow"
    );
  });

  // Danh sách quản trị thì ngược lại, và cố ý giữ `startsWith`: khớp rộng ở đây là khoá nhầm một
  // cửa, còn khớp hẹp là để hở một route quản trị không ai canh.
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
