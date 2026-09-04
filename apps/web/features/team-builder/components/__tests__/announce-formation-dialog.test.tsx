// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnnounceFormationDialog } from "../announce-formation-dialog";

afterEach(cleanup);

/**
 * Render the dialog of a saved day whose two matches are partly filled.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderDialog(
  props: Partial<React.ComponentProps<typeof AnnounceFormationDialog>> = {}
) {
  render(
    <AnnounceFormationDialog
      open
      filledCounts={[56, 48]}
      slotCount={60}
      blocked={false}
      sending={false}
      onOpenChange={vi.fn()}
      onConfirm={vi.fn()}
      {...props}
    />
  );
}

/**
 * Read the confirm button off the rendered dialog.
 * @returns The button element
 */
function confirmButton(): HTMLButtonElement {
  return screen.getByRole("button", {
    name: /Gửi thông báo|Đang gửi/,
  }) as HTMLButtonElement;
}

describe("AnnounceFormationDialog", () => {
  it("nói số người còn thiếu của từng trận", () => {
    renderDialog();

    expect(screen.getByText(/Trận 1: thiếu 4\/60/)).toBeTruthy();
    expect(screen.getByText(/Trận 2: thiếu 12\/60/)).toBeTruthy();
  });

  it("trận xếp đủ thì nói đủ chứ không nói thiếu 0", () => {
    renderDialog({ filledCounts: [60] });

    expect(screen.getByText(/Trận 1: đủ 60\/60/)).toBeTruthy();
  });

  it("xác nhận thì gọi onConfirm", () => {
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledOnce();
  });

  // Ảnh gửi cho cả bang mà khác dữ liệu đã lưu là mâu thuẫn không ai gỡ được về sau.
  it("còn thay đổi chưa lưu thì chặn gửi và nói phải lưu trước", () => {
    renderDialog({ blocked: true });

    expect(confirmButton().disabled).toBe(true);
    expect(screen.getByText(/chưa lưu/)).toBeTruthy();
  });

  it("đang gửi thì khoá nút xác nhận", () => {
    renderDialog({ sending: true });

    expect(confirmButton().disabled).toBe(true);
  });
});
