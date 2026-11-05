// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { isSkipKey } from "../skip-key";

function press(init: KeyboardEventInit, target?: HTMLElement): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { cancelable: true, bubbles: true, ...init });
  if (target) {
    document.body.append(target);
    target.dispatchEvent(event);
    target.remove();
  }
  return event;
}

describe("isSkipKey", () => {
  it("accepts s in either case", () => {
    expect(isSkipKey(press({ key: "s" }))).toBe(true);
    expect(isSkipKey(press({ key: "S" }))).toBe(true);
  });

  it("ignores other keys", () => {
    expect(isSkipKey(press({ key: "a" }))).toBe(false);
  });

  it.each(["ctrlKey", "metaKey", "altKey"] as const)("ignores s with %s held", (modifier) => {
    expect(isSkipKey(press({ key: "s", [modifier]: true }))).toBe(false);
  });

  it("ignores a key another handler already took", () => {
    const event = new KeyboardEvent("keydown", { key: "s", cancelable: true });
    event.preventDefault();

    expect(isSkipKey(event)).toBe(false);
  });

  it("ignores s typed into a field", () => {
    expect(isSkipKey(press({ key: "s" }, document.createElement("input")))).toBe(false);
  });

  it("ignores s pressed inside a dialog", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const button = document.createElement("button");
    dialog.append(button);
    document.body.append(dialog);
    const event = new KeyboardEvent("keydown", { key: "s", bubbles: true });
    button.dispatchEvent(event);
    const result = isSkipKey(event);
    dialog.remove();

    expect(result).toBe(false);
  });
});
