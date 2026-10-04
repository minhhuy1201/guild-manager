// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SaveConflictDialog } from "../save-conflict-dialog";

afterEach(cleanup);

/**
 * Render the dialog with a stale formation unless told otherwise.
 * @param props - Fields to change from the default
 * @returns The three handlers, for assertions
 */
function renderDialog(
  props: Partial<React.ComponentProps<typeof SaveConflictDialog>> = {}
) {
  const handlers = {
    onReload: vi.fn(),
    onOverwrite: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };
  render(
    <SaveConflictDialog
      formationLabel="Thứ 7 · Bang Chiến"
      isFormationStale
      isTeamNamesStale={false}
      {...handlers}
      {...props}
    />
  );

  return handlers;
}

describe("SaveConflictDialog", () => {
  it("chỉ tên đội xung đột: chỉ liệt kê tên đội, không cảnh báo người vắng", () => {
    renderDialog({ isFormationStale: false, isTeamNamesStale: true });

    expect(screen.getByText("Tên đội")).toBeTruthy();
    expect(screen.queryByText(/Đội hình Thứ 7/)).toBeNull();
    expect(screen.queryByText(/báo vắng/)).toBeNull();
  });

  it("đội hình xung đột: liệt kê nhãn ngày và cảnh báo người vắng", () => {
    renderDialog();

    expect(screen.getByText("Đội hình Thứ 7 · Bang Chiến")).toBeTruthy();
    expect(
      screen.getByText("Người đã báo vắng có thể bị đặt lại vào đội hình.")
    ).toBeTruthy();
  });

  it("Tải bản mới nhất gọi onReload", () => {
    const { onReload } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Tải bản mới nhất/ }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it("Vẫn ghi đè gọi onOverwrite", () => {
    const { onOverwrite } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Vẫn ghi đè/ }));

    expect(onOverwrite).toHaveBeenCalledTimes(1);
  });

  it("Đóng gọi onClose, không gọi hai cái kia", () => {
    const { onClose, onReload, onOverwrite } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Đóng/ }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReload).not.toHaveBeenCalled();
    expect(onOverwrite).not.toHaveBeenCalled();
  });

  it("đang ghi đè thì khoá cả ba nút", () => {
    renderDialog({ onOverwrite: vi.fn(() => new Promise<void>(() => undefined)) });

    fireEvent.click(screen.getByRole("button", { name: /Vẫn ghi đè/ }));

    for (const name of [/Tải bản mới nhất/, /Vẫn ghi đè/]) {
      expect(
        (screen.getByRole("button", { name }) as HTMLButtonElement).disabled
      ).toBe(true);
    }
  });

  it("ghi đè lỗi trước khi lưu: giữ dialog, hiện lý do", async () => {
    renderDialog({
      onOverwrite: vi.fn().mockRejectedValue(new Error("Ngày đã bị xoá.")),
    });

    fireEvent.click(screen.getByRole("button", { name: /Vẫn ghi đè/ }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ngày đã bị xoá."
    );
  });

  it("không phần nào xung đột: dialog đóng", () => {
    renderDialog({ isFormationStale: false, isTeamNamesStale: false });

    expect(screen.queryByText("Có người vừa lưu trước bạn")).toBeNull();
  });
});
