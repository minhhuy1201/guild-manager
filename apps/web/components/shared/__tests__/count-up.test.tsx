// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CountUp } from "../count-up";

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

/** What the counter currently shows. */
function shown(): string {
  return screen.getByTestId("count").textContent ?? "";
}

describe("CountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubMatchMedia(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts below the final value and ends exactly on it", () => {
    render(<CountUp value={42} data-testid="count" />);

    expect(Number(shown())).toBeLessThan(42);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(shown()).toBe("42");
  });

  it("counts up through values in between", () => {
    render(<CountUp value={100} data-testid="count" />);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const midway = Number(shown());
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(100);
  });

  it("shows the final value at once under reduced motion", () => {
    stubMatchMedia(true);

    render(<CountUp value={42} data-testid="count" />);

    expect(shown()).toBe("42");
  });

  it("does not run again when a background refetch changes the value", () => {
    const { rerender } = render(<CountUp value={10} data-testid="count" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    rerender(<CountUp value={11} data-testid="count" />);

    expect(shown()).toBe("11");
  });

  it("shows zero as zero", () => {
    render(<CountUp value={0} data-testid="count" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(shown()).toBe("0");
  });
});
