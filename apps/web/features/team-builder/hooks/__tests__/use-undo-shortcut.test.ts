// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useUndoShortcut } from "../use-undo-shortcut";

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

/**
 * Press a key on the given element, the window by default.
 * @param init - Key and modifiers
 * @param target - Element the key goes to
 * @returns false when a listener prevented the browser's default action
 */
function press(init: KeyboardEventInit, target: Element | Window = window): boolean {
  return fireEvent.keyDown(target, init);
}

describe("useUndoShortcut", () => {
  it("Ctrl+Z gọi onUndo và chặn mặc định của trình duyệt", () => {
    const onUndo = vi.fn();
    renderHook(() => useUndoShortcut(onUndo, true));

    const notPrevented = press({ key: "z", ctrlKey: true });

    expect(onUndo).toHaveBeenCalledOnce();
    expect(notPrevented).toBe(false);
  });

  it("Cmd+Z trên macOS cũng hoàn tác", () => {
    const onUndo = vi.fn();
    renderHook(() => useUndoShortcut(onUndo, true));

    press({ key: "z", metaKey: true });

    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("Caps Lock bật (phím Z hoa) vẫn hoàn tác", () => {
    const onUndo = vi.fn();
    renderHook(() => useUndoShortcut(onUndo, true));

    press({ key: "Z", ctrlKey: true });

    expect(onUndo).toHaveBeenCalledOnce();
  });

  // Ctrl+Shift+Z is redo in every application; treating it as undo means pressing redo steps
  // backwards instead.
  it("Ctrl+Shift+Z không phải hoàn tác", () => {
    const onUndo = vi.fn();
    renderHook(() => useUndoShortcut(onUndo, true));

    const notPrevented = press({ key: "Z", ctrlKey: true, shiftKey: true });

    expect(onUndo).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it.each(["input", "textarea"])(
    "đang gõ trong %s thì để trình duyệt hoàn tác chữ",
    (tag) => {
      const onUndo = vi.fn();
      const field = document.createElement(tag);
      document.body.append(field);
      renderHook(() => useUndoShortcut(onUndo, true));

      const notPrevented = press({ key: "z", ctrlKey: true }, field);

      expect(onUndo).not.toHaveBeenCalled();
      expect(notPrevented).toBe(true);
    }
  );

  // The line-up sits behind the dialog; undoing then changes something the user cannot see.
  it.each(["dialog", "alertdialog"])(
    "phím bấm trong %s thì không hoàn tác đội hình",
    (role) => {
      const onUndo = vi.fn();
      const dialog = document.createElement("div");
      dialog.setAttribute("role", role);
      const button = document.createElement("button");
      dialog.append(button);
      document.body.append(dialog);
      renderHook(() => useUndoShortcut(onUndo, true));

      press({ key: "z", ctrlKey: true }, button);

      expect(onUndo).not.toHaveBeenCalled();
    }
  );

  it("không có gì để hoàn tác thì không gọi onUndo và không chặn gì", () => {
    const onUndo = vi.fn();
    renderHook(() => useUndoShortcut(onUndo, false));

    const notPrevented = press({ key: "z", ctrlKey: true });

    expect(onUndo).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it("phím Z trơn không làm gì", () => {
    const onUndo = vi.fn();
    renderHook(() => useUndoShortcut(onUndo, true));

    press({ key: "z" });

    expect(onUndo).not.toHaveBeenCalled();
  });

  it("gỡ màn hình thì gỡ luôn phím tắt", () => {
    const onUndo = vi.fn();
    const { unmount } = renderHook(() => useUndoShortcut(onUndo, true));

    unmount();
    press({ key: "z", ctrlKey: true });

    expect(onUndo).not.toHaveBeenCalled();
  });
});
