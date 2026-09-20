import { describe, expect, it } from "vitest";

import { TOOL_SHORTCUTS, toolForKey } from "../lib/shortcuts";
import { TOOL_LABELS } from "../types/tactic";

describe("tool shortcuts", () => {
  it("gives every tool a key", () => {
    expect(Object.keys(TOOL_SHORTCUTS).sort()).toEqual(
      Object.keys(TOOL_LABELS).sort()
    );
  });

  it("gives no two tools the same key", () => {
    const keys = Object.values(TOOL_SHORTCUTS);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("picks the tool a key belongs to", () => {
    expect(toolForKey("1")).toBe("token");
    expect(toolForKey("5")).toBe("eraser");
  });

  it("picks nothing for a key that belongs to no tool", () => {
    expect(toolForKey("z")).toBeNull();
  });
});
