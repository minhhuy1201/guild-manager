// @vitest-environment jsdom
import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSaveShortcut } from "../use-save-shortcut";

afterEach(cleanup);

/**
 * Press a key on the window.
 * @param init - Key and modifiers
 * @returns false when a listener prevented the browser's default action
 */
function press(init: KeyboardEventInit): boolean {
  return fireEvent.keyDown(window, init);
}

describe("useSaveShortcut", () => {
  it("Ctrl+S gọi onSave và chặn hộp thoại lưu trang", () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave, true));

    const notPrevented = press({ key: "s", ctrlKey: true });

    expect(onSave).toHaveBeenCalledOnce();
    expect(notPrevented).toBe(false);
  });

  it("Cmd+S trên macOS cũng lưu", () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave, true));

    press({ key: "s", metaKey: true });

    expect(onSave).toHaveBeenCalledOnce();
  });

  it("Caps Lock bật (phím S hoa) vẫn lưu", () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave, true));

    press({ key: "S", ctrlKey: true });

    expect(onSave).toHaveBeenCalledOnce();
  });

  // Không có gì để lưu thì phím tắt vẫn không được mở hộp thoại lưu trang của trình duyệt.
  it("không có gì để lưu thì không gọi onSave nhưng vẫn chặn hộp thoại", () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave, false));

    const notPrevented = press({ key: "s", ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
    expect(notPrevented).toBe(false);
  });

  // Đội hình nằm sau dialog: lưu lúc đó là ghi thứ người dùng không nhìn thấy.
  it("phím bấm trong dialog thì không lưu nhưng vẫn chặn hộp thoại", () => {
    const onSave = vi.fn();
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const button = document.createElement("button");
    dialog.append(button);
    document.body.append(dialog);
    renderHook(() => useSaveShortcut(onSave, true));

    const notPrevented = fireEvent.keyDown(button, { key: "s", ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
    expect(notPrevented).toBe(false);
    dialog.remove();
  });

  it("phím S trơn không làm gì", () => {
    const onSave = vi.fn();
    renderHook(() => useSaveShortcut(onSave, true));

    const notPrevented = press({ key: "s" });

    expect(onSave).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });

  it("gỡ màn hình thì gỡ luôn phím tắt", () => {
    const onSave = vi.fn();
    const { unmount } = renderHook(() => useSaveShortcut(onSave, true));

    unmount();
    press({ key: "s", ctrlKey: true });

    expect(onSave).not.toHaveBeenCalled();
  });
});
