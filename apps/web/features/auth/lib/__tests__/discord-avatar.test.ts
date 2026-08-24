import { describe, expect, it } from "vitest";

import { accountInitials } from "../account-initials";
import { discordAvatarUrl } from "../discord-avatar";

describe("discordAvatarUrl", () => {
  it("dựng URL png cho avatar tĩnh", () => {
    expect(discordAvatarUrl("123456789012345678", "a1b2c3")).toBe(
      "https://cdn.discordapp.com/avatars/123456789012345678/a1b2c3.png?size=64"
    );
  });

  it("xin đuôi gif cho avatar động", () => {
    // Hash bắt đầu bằng "a_" là avatar động; xin .png sẽ ra ảnh tĩnh mờ.
    expect(discordAvatarUrl("123456789012345678", "a_9f8e7d")).toBe(
      "https://cdn.discordapp.com/avatars/123456789012345678/a_9f8e7d.gif?size=64"
    );
  });

  it("trả null khi chưa có hash", () => {
    expect(discordAvatarUrl("123456789012345678", null)).toBeNull();
  });
});

describe("accountInitials", () => {
  it("lấy chữ cái đầu của tối đa hai từ", () => {
    expect(accountInitials("Mèo Mập")).toBe("MM");
    expect(accountInitials("Mèo Mập Giang Hồ")).toBe("MM");
  });

  it("một từ thì lấy một chữ", () => {
    expect(accountInitials("meobeo")).toBe("M");
  });

  it("không có tên thì trả dấu hỏi", () => {
    expect(accountInitials(null)).toBe("?");
    expect(accountInitials("   ")).toBe("?");
  });
});
