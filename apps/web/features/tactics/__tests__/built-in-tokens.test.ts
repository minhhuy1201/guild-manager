import { describe, expect, it } from "vitest";
import { TACTIC_TOKEN_ICONS } from "@guild/shared/enums";

import { BUILT_IN_TOKENS } from "../lib/built-in-tokens";
import { tokenIcon } from "../lib/token-icon";

describe("built-in tokens", () => {
  it("offers the seven roles and the ten numbered teams", () => {
    expect(BUILT_IN_TOKENS).toHaveLength(17);
    expect(BUILT_IN_TOKENS.slice(0, 7).map((token) => token.label)).toEqual([
      "Đội công",
      "Đội thủ",
      "Cơ động",
      "Trinh sát",
      "Tập kết",
      "Đội trụ",
      "Bảo tiêu",
    ]);
    expect(BUILT_IN_TOKENS.at(-1)?.label).toBe("Đội 10");
  });

  it("gives every token an icon the enum allows and the web can render", () => {
    for (const token of BUILT_IN_TOKENS) {
      expect(TACTIC_TOKEN_ICONS).toContain(token.icon);
      expect(tokenIcon(token.icon)).toBeDefined();
    }
  });

  it("renders every icon key the enum allows", () => {
    for (const key of TACTIC_TOKEN_ICONS) {
      expect(tokenIcon(key)).toBeDefined();
    }
  });
});
