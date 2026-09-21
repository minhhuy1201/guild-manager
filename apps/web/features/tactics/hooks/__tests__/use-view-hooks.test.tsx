// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsDesktop } from "../use-is-desktop";
import { useStageSize } from "../use-stage-size";
import { useUnsavedGuard } from "../use-unsaved-guard";
import { renderTacticHook } from "./render-tactic-hook";

/**
 * Stub `matchMedia` with a query that matches or not, and expose its listeners.
 * @param matches - Whether the query matches
 * @returns A way to flip the match and notify the listeners
 */
function stubMatchMedia(matches: boolean) {
  let current = matches;
  const listeners = new Set<() => void>();

  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return current;
    },
    addEventListener: (_event: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) =>
      listeners.delete(listener),
  }));

  return (next: boolean) => {
    current = next;
    for (const listener of listeners) listener();
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsDesktop", () => {
  it("reports a wide screen", () => {
    stubMatchMedia(true);

    const { result } = renderTacticHook(() => useIsDesktop());

    expect(result.current).toBe(true);
  });

  it("follows the screen when it crosses the breakpoint", () => {
    const flip = stubMatchMedia(false);
    const { result } = renderTacticHook(() => useIsDesktop());

    expect(result.current).toBe(false);

    act(() => flip(true));
    expect(result.current).toBe(true);
  });
});

describe("useStageSize", () => {
  it("measures nothing until a box is handed to its ref", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );

    const { result } = renderTacticHook(() => useStageSize());

    expect(result.current.width).toBe(0);
    // A callback ref, so the hook hands back a function rather than a ref object: the canvas box
    // mounts later than the hook, and a ref object would never be looked at again.
    expect(result.current.ref).toBeTypeOf("function");
  });

  it("forgets the width when its box goes away", () => {
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect = disconnect;
      }
    );

    const { result } = renderTacticHook(() => useStageSize());
    const box = document.createElement("div");
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({
      width: 800,
    } as DOMRect);

    act(() => result.current.ref(box));
    expect(result.current.width).toBe(800);

    act(() => result.current.ref(null));
    expect(result.current.width).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });
});

describe("useUnsavedGuard", () => {
  it("guards the page only while there are unsaved edits", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");

    const clean = renderTacticHook(() => useUnsavedGuard(false));
    expect(
      addEventListener.mock.calls.some(([name]) => name === "beforeunload")
    ).toBe(false);
    clean.unmount();

    const dirty = renderTacticHook(() => useUnsavedGuard(true));
    expect(
      addEventListener.mock.calls.some(([name]) => name === "beforeunload")
    ).toBe(true);

    dirty.unmount();
    expect(
      removeEventListener.mock.calls.some(([name]) => name === "beforeunload")
    ).toBe(true);

    addEventListener.mockRestore();
    removeEventListener.mockRestore();
  });

  it("asks the browser to confirm the navigation", () => {
    renderTacticHook(() => useUnsavedGuard(true));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
