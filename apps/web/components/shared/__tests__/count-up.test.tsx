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
  return (
    screen.getByTestId("count").querySelector("[data-slot=count-up-value]")
      ?.textContent ?? ""
  );
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

  // The digit count grows while counting (0 -> 9 -> 35); a hidden copy of the final value keeps the
  // cell as wide as it will end up so a table never reflows.
  it("reserves the final width from the first frame", () => {
    render(<CountUp value={35} data-testid="count" />);

    const reserved = screen
      .getByTestId("count")
      .querySelector("[aria-hidden=true]");

    expect(reserved?.textContent).toBe("35");
    expect(shown()).toBe("0");
  });

  it("settles on the new value when it changes mid-count, never restarting from zero", () => {
    const { rerender } = render(<CountUp value={10} data-testid="count" />);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    const before = Number(shown());
    expect(before).toBeGreaterThan(0);

    rerender(<CountUp value={20} data-testid="count" />);

    expect(Number(shown())).toBeGreaterThanOrEqual(before);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(shown()).toBe("20");
  });

  it("shows zero as zero", () => {
    render(<CountUp value={0} data-testid="count" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(shown()).toBe("0");
  });
});
