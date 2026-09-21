// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useModifierKey } from "../hooks/use-modifier-key";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Show whatever the hook calls the modifier.
 * @returns The modifier as text
 */
function Modifier() {
  return <span>{useModifierKey()}</span>;
}

/**
 * Render the hook with a given user agent.
 * @param userAgent - What `navigator.userAgent` should say
 * @returns Nothing
 */
function renderWithAgent(userAgent: string) {
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue(userAgent);
  render(<Modifier />);
}

describe("useModifierKey", () => {
  it("calls the modifier ⌘ on a Mac", () => {
    renderWithAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");

    expect(screen.getByText("⌘")).toBeTruthy();
  });

  it("calls it Ctrl everywhere else", () => {
    renderWithAgent("Mozilla/5.0 (X11; Linux x86_64)");

    expect(screen.getByText("Ctrl")).toBeTruthy();
  });
});
