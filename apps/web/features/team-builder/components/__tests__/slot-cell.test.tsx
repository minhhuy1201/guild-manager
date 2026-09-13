// @vitest-environment jsdom
import { DndContext } from "@dnd-kit/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FORMATION } from "../../lib/mock-formation";
import type { FormationLayout } from "../../types/formation";
import { SlotCell } from "../slot-cell";

afterEach(cleanup);

const SLOT = FORMATION.slots[0];

/**
 * Render one empty slot of the formation.
 * @param props - Note, read-only flag and layout to use
 * @returns The note change spy
 */
function renderSlot({
  note = "",
  readOnly = false,
  layout = "screen",
}: { note?: string; readOnly?: boolean; layout?: FormationLayout } = {}) {
  const onNoteChange = vi.fn();
  render(
    <DndContext>
      <SlotCell
        slot={SLOT}
        note={note}
        readOnly={readOnly}
        layout={layout}
        onNoteChange={onNoteChange}
      />
    </DndContext>
  );

  return onNoteChange;
}

describe("SlotCell — ghi chú thu gọn trên màn hình", () => {
  // 60 ô nhập luôn mở chiếm 2/5 bề ngang và cắt tên nhân vật.
  it("ô chưa có ghi chú chỉ có nút thêm, không có ô nhập", () => {
    renderSlot();

    expect(screen.getByRole("button", { name: "Thêm ghi chú" })).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("bấm nút thêm thì mở ô nhập, con trỏ đã nằm sẵn trong đó", () => {
    renderSlot();

    fireEvent.click(screen.getByRole("button", { name: "Thêm ghi chú" }));

    const input = screen.getByRole("textbox");
    expect(document.activeElement).toBe(input);
  });

  it("gõ vào ô nhập thì ghi vào nháp", () => {
    const onNoteChange = renderSlot();
    fireEvent.click(screen.getByRole("button", { name: "Thêm ghi chú" }));

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "vào sau" },
    });

    expect(onNoteChange).toHaveBeenCalledWith(SLOT.id, "vào sau");
  });

  it("click ra ngoài thì đóng ô nhập", () => {
    renderSlot();
    fireEvent.click(screen.getByRole("button", { name: "Thêm ghi chú" }));

    fireEvent.blur(screen.getByRole("textbox"));

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("Escape cũng đóng ô nhập", () => {
    renderSlot();
    fireEvent.click(screen.getByRole("button", { name: "Thêm ghi chú" }));

    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });

    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("ô đã có ghi chú thì hiện chữ, bấm vào để sửa", () => {
    renderSlot({ note: "giữ buồng" });

    fireEvent.click(screen.getByRole("button", { name: /giữ buồng/ }));

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe(
      "giữ buồng"
    );
  });
});

describe("SlotCell — chỉ đọc", () => {
  it("không có ghi chú thì không hiện gì", () => {
    renderSlot({ readOnly: true });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("có ghi chú thì hiện chữ, không sửa được", () => {
    renderSlot({ note: "giữ buồng", readOnly: true });

    expect(screen.getByText("giữ buồng")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("SlotCell — ảnh gửi Discord", () => {
  // Ảnh gửi Discord giữ nguyên như trước: mỗi ô một cột ghi chú, kể cả khi trống.
  it("luôn có cột ghi chú, kể cả ô trống", () => {
    renderSlot({ readOnly: true, layout: "capture" });

    expect(screen.getByRole("textbox")).toBeTruthy();
  });
});
