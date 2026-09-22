// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { useLeaveGuard } from "../use-leave-guard";

// React only flushes updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

let link: HTMLAnchorElement;

beforeEach(() => {
  link = document.createElement("a");
  link.href = "/chien-thuat";
  link.textContent = "Chiến thuật";
  document.body.append(link);
});

afterEach(() => {
  cleanup();
  link.remove();
});

/**
 * Click the test link the way a person does, and report whether the click was held back.
 * @param init - Modifier keys or button to click with
 * @returns Whether the browser's own navigation was cancelled
 */
function clickLink(init: MouseEventInit = {}): boolean {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });

  act(() => {
    link.dispatchEvent(event);
  });

  return event.defaultPrevented;
}

describe("useLeaveGuard", () => {
  it("lets every link through while nothing is unsaved", () => {
    const { result } = renderHook(() => useLeaveGuard(false, vi.fn()));

    expect(clickLink()).toBe(false);
    expect(result.current.leavingTo).toBeNull();
  });

  it("holds an in-app link back while the drawing is unsaved, and remembers where it led", () => {
    const { result } = renderHook(() => useLeaveGuard(true, vi.fn()));

    expect(clickLink()).toBe(true);
    expect(result.current.leavingTo).toBe("/chien-thuat");
    expect(push).not.toHaveBeenCalled();
  });

  it("leaves new-tab clicks, other sites and in-page anchors alone", () => {
    const { result } = renderHook(() => useLeaveGuard(true, vi.fn()));

    expect(clickLink({ ctrlKey: true })).toBe(false);
    expect(clickLink({ metaKey: true })).toBe(false);

    link.target = "_blank";
    expect(clickLink()).toBe(false);
    link.removeAttribute("target");

    link.href = "https://discord.com/channels/1";
    expect(clickLink()).toBe(false);

    link.href = `${window.location.pathname}#ghi-chu`;
    expect(clickLink()).toBe(false);

    expect(result.current.leavingTo).toBeNull();
  });

  it("stays on the page when the admin chooses to stay", () => {
    const { result } = renderHook(() => useLeaveGuard(true, vi.fn()));
    clickLink();

    act(() => result.current.stay());

    expect(result.current.leavingTo).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("follows the link without saving when the admin discards the drawing", () => {
    const save = vi.fn();
    const { result } = renderHook(() => useLeaveGuard(true, save));
    clickLink();

    act(() => result.current.discard());

    expect(push).toHaveBeenCalledWith("/chien-thuat");
    expect(save).not.toHaveBeenCalled();
  });

  it("saves, then follows the link once the save went through", async () => {
    const save = vi.fn(() => Promise.resolve(true));
    const { result } = renderHook(() => useLeaveGuard(true, save));
    clickLink();

    await act(() => result.current.saveAndLeave());

    expect(save).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/chien-thuat");
  });

  it("stays on the page, dialog closed, when the save fails", async () => {
    const save = vi.fn(() => Promise.resolve(false));
    const { result } = renderHook(() => useLeaveGuard(true, save));
    clickLink();

    await act(() => result.current.saveAndLeave());

    expect(push).not.toHaveBeenCalled();
    expect(result.current.leavingTo).toBeNull();
  });

  it("reports the save in flight so the dialog can lock its buttons", async () => {
    let finish: (saved: boolean) => void = () => {};
    const save = vi.fn(
      () => new Promise<boolean>((resolve) => (finish = resolve))
    );
    const { result } = renderHook(() => useLeaveGuard(true, save));
    clickLink();

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.saveAndLeave();
    });
    expect(result.current.saving).toBe(true);

    await act(async () => {
      finish(true);
      await pending;
    });
    expect(result.current.saving).toBe(false);
  });

  it("keeps the browser's own confirmation for a reload or a closed tab", () => {
    renderHook(() => useLeaveGuard(true, vi.fn()));

    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });
});
