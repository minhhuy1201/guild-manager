// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useReducedMotion } from "../hooks/use-reduced-motion";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Point `matchMedia` at a fixed answer.
 * @param matches - What every query should report
 */
function stubMatchMedia(matches: boolean): void {
  vi.stubGlobal("matchMedia", () => ({
    matches,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

/**
 * A component printing what the hook answered.
 * @returns The readout
 */
function Readout() {
  return <span data-testid="answer">{String(useReducedMotion())}</span>;
}

describe("useReducedMotion", () => {
  it("reports true while the system asks for less motion", () => {
    stubMatchMedia(true);
    render(<Readout />);

    expect(screen.getByTestId("answer").textContent).toBe("true");
  });

  it("reports false otherwise", () => {
    stubMatchMedia(false);
    render(<Readout />);

    expect(screen.getByTestId("answer").textContent).toBe("false");
  });
});
