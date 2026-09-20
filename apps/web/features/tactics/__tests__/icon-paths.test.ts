import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { TACTIC_TOKEN_ICONS } from "@guild/shared/enums";

import { TOKEN_ICON_PATHS } from "../lib/icon-paths";

const require = createRequire(import.meta.url);
const iconNodes = require("lucide-static/icon-nodes.json") as Record<
  string,
  [string, Record<string, string | number>][]
>;
const { iconToPaths } = require("../lib/icon-paths.build.cjs") as {
  iconToPaths: (icon: [string, Record<string, string | number>][]) => string[];
};

describe("token icon paths", () => {
  it("covers every icon key the contract allows", () => {
    expect(Object.keys(TOKEN_ICON_PATHS).sort()).toEqual(
      [...TACTIC_TOKEN_ICONS].sort()
    );
  });

  it("still matches the lucide artwork it was generated from", () => {
    for (const key of TACTIC_TOKEN_ICONS) {
      expect(TOKEN_ICON_PATHS[key]).toEqual(iconToPaths(iconNodes[key]));
    }
  });

  it("gives every icon something to draw", () => {
    for (const key of TACTIC_TOKEN_ICONS) {
      expect(TOKEN_ICON_PATHS[key].length).toBeGreaterThan(0);
    }
  });
});
