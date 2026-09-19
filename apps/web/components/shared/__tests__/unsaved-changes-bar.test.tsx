// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UnsavedChangesBar } from "../unsaved-changes-bar";

afterEach(cleanup);

/**
 * Render the bar with three unsaved changes, idle.
 * @param props - Fields to change from the default
 * @returns The two handler spies
 */
function renderBar(
  props: Partial<React.ComponentProps<typeof UnsavedChangesBar>> = {}
) {
  const onSave = vi.fn();
  const onReset = vi.fn();
  render(
    <UnsavedChangesBar
      message="3 thay đổi chưa lưu"
      resetLabel="Đặt lại"
      saving={false}
      onSave={onSave}
      onReset={onReset}
      {...props}
    />
  );

  return { onSave, onReset };
}

/**
 * Read a button of the bar by its name.
 * @param name - Accessible name to match
 * @returns The button element
 */
function button(name: RegExp): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("UnsavedChangesBar", () => {
  it("nói có bao nhiêu thay đổi chưa lưu", () => {
    renderBar();

    expect(screen.getByText("3 thay đổi chưa lưu")).toBeTruthy();
  });

  it("bấm Lưu gọi onSave, bấm Đặt lại gọi onReset", () => {
    const { onSave, onReset } = renderBar();

    fireEvent.click(button(/^Lưu$/));
    fireEvent.click(button(/Đặt lại/));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it("nhãn nút bỏ nháp do nơi gọi đặt", () => {
    renderBar({ resetLabel: "Huỷ" });

    expect(button(/Huỷ/)).toBeTruthy();
  });

  it("đang lưu thì khoá cả hai nút và nói đang lưu", () => {
    renderBar({ saving: true });

    expect(button(/Đang lưu/).disabled).toBe(true);
    expect(button(/Đặt lại/).disabled).toBe(true);
  });

  it("lưu lỗi thì hiện lỗi thay cho câu đếm", () => {
    renderBar({ errorMessages: ["Máy chủ bận."] });

    expect(screen.getByText("Máy chủ bận.")).toBeTruthy();
    expect(screen.queryByText("3 thay đổi chưa lưu")).toBeNull();
  });
});

// There is no Ctrl+Z on a phone: the save bar carries an undo button on any screen that has a step
// to undo.
describe("UnsavedChangesBar - nút Hoàn tác", () => {
  it("có undo thì có nút Hoàn tác, bấm gọi onUndo một lần", () => {
    const onUndo = vi.fn();
    renderBar({ undo: { onUndo, canUndo: true } });

    fireEvent.click(button(/Hoàn tác/));

    expect(onUndo).toHaveBeenCalledOnce();
  });

  it("canUndo=false thì nút Hoàn tác bị khoá", () => {
    renderBar({ undo: { onUndo: vi.fn(), canUndo: false } });

    expect(button(/Hoàn tác/).disabled).toBe(true);
  });

  it("đang lưu thì nút Hoàn tác cũng bị khoá", () => {
    renderBar({ saving: true, undo: { onUndo: vi.fn(), canUndo: true } });

    expect(button(/Hoàn tác/).disabled).toBe(true);
  });

  // The attendance board shares this bar but keeps no undo history.
  it("không truyền undo thì không có nút Hoàn tác", () => {
    renderBar();

    expect(screen.queryByRole("button", { name: /Hoàn tác/ })).toBeNull();
  });
});
