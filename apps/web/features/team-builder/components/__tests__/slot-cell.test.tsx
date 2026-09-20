// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Slot } from "../../types/formation";
import { SlotCell } from "../slot-cell";

afterEach(cleanup);

const SLOT: Slot = { id: "team-1-pos-3", team: 1, position: 3 };

const NOTE = "Đứng cửa trái";

/**
 * Render one empty slot.
 * @param options - The slot's note and whether the day is read-only
 * @returns Nothing
 */
function renderSlot({ note = "", readOnly = false } = {}) {
  render(
    <DndContext>
      <SlotCell
        slot={SLOT}
        note={note}
        readOnly={readOnly}
        onNoteChange={() => {}}
      />
    </DndContext>
  );
}

/**
 * The button that opens the note on a phone.
 * @returns The button element
 */
function noteButton(): HTMLElement {
  return screen.getByRole("button", { name: "Ghi chú" });
}

// The note field takes two fifths of the row, leaving a few characters of the name on a phone;
// below sm it collapses into a button.
describe("SlotCell - ghi chú gọn dưới sm", () => {
  it("có nút ghi chú, bấm thì mở ô nhập và aria-expanded=true", () => {
    renderSlot();

    const wrapper = screen.getByRole("textbox").parentElement as HTMLElement;
    expect(noteButton().getAttribute("aria-expanded")).toBe("false");
    expect(wrapper.className).toContain("max-sm:hidden");

    fireEvent.click(noteButton());

    expect(noteButton().getAttribute("aria-expanded")).toBe("true");
    expect(wrapper.className).not.toContain("max-sm:hidden");
  });

  it("ô đã có ghi chú thì nút có chấm và ghi chú hiện thành chữ dưới hàng", () => {
    renderSlot({ note: NOTE });

    expect(noteButton().dataset.hasNote).toBe("true");
    // The field holds the text too; the line under the row is the one a closed note shows.
    expect(screen.getByText(NOTE, { selector: "p" })).toBeTruthy();
  });

  it("ô chưa có ghi chú thì nút không có chấm", () => {
    renderSlot();

    expect(noteButton().dataset.hasNote).toBe("false");
  });

  // Two inputs for the same note can drift apart, and a screen reader reads it twice.
  it("chỉ có một ô nhập ghi chú trong DOM", () => {
    renderSlot({ note: NOTE });

    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("ngày đã đánh xong thì không có nút ghi chú nhưng vẫn đọc được ghi chú", () => {
    renderSlot({ note: NOTE, readOnly: true });

    expect(screen.queryByRole("button", { name: "Ghi chú" })).toBeNull();
    // The field holds the text too; the line under the row is the one a closed note shows.
    expect(screen.getByText(NOTE, { selector: "p" })).toBeTruthy();
  });
});
