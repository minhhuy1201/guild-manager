// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { isTypingTarget } from "../lib/shortcuts";

describe("isTypingTarget", () => {
  // The `isContentEditable` branch is left out on purpose: jsdom never sets that property, so a
  // test of it would assert jsdom's gap rather than the guard.
  it("recognises the fields a shortcut must keep away from", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
  });

  it("leaves everything else to the shortcut", () => {
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
