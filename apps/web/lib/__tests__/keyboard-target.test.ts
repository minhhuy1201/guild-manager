// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  belongsElsewhere,
  isInsideDialog,
  isTypingTarget,
} from "../keyboard-target";

/**
 * Put a button inside an element carrying a role, the way a dialog's content is.
 * @param role - The ancestor's role
 * @returns The button
 */
function buttonInside(role: string): HTMLButtonElement {
  const container = document.createElement("div");
  const button = document.createElement("button");
  container.setAttribute("role", role);
  container.append(button);

  return button;
}

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

describe("isInsideDialog", () => {
  it("finds a dialog or an alert dialog above the target", () => {
    expect(isInsideDialog(buttonInside("dialog"))).toBe(true);
    expect(isInsideDialog(buttonInside("alertdialog"))).toBe(true);
  });

  it("says no for anything outside one", () => {
    expect(isInsideDialog(buttonInside("toolbar"))).toBe(false);
    expect(isInsideDialog(null)).toBe(false);
  });
});

describe("belongsElsewhere", () => {
  it("claims a key typed into a field or pressed inside a dialog", () => {
    expect(belongsElsewhere(document.createElement("input"))).toBe(true);
    expect(belongsElsewhere(buttonInside("dialog"))).toBe(true);
  });

  it("leaves a key pressed on the page itself to the shortcut", () => {
    expect(belongsElsewhere(document.createElement("button"))).toBe(false);
    expect(belongsElsewhere(null)).toBe(false);
  });
});
