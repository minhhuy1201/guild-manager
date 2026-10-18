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
      notifyMembers
      outcome={null}
      onNotifyMembersChange={vi.fn()}
      onRetry={vi.fn()}
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

  // An image sent to the whole guild that differs from the saved data is a contradiction nobody can
  // untangle later.
  it("còn thay đổi chưa lưu thì chặn gửi và nói phải lưu trước", () => {
    renderDialog({ blocked: true });

    expect(confirmButton().disabled).toBe(true);
    expect(screen.getByText(/chưa lưu/)).toBeTruthy();
  });

  it("đang gửi thì khoá nút xác nhận", () => {
    renderDialog({ sending: true });

    expect(confirmButton().disabled).toBe(true);
  });

  it("có ô nhắn riêng từng người, đang bật theo mặc định của hook", () => {
    renderDialog({ notifyMembers: true });

    const box = screen.getByRole("checkbox", { name: /Nhắn riêng từng người/ });

    expect(box.getAttribute("aria-checked")).toBe("true");
  });

  it("bấm ô nhắn riêng thì báo giá trị mới", () => {
    const onNotifyMembersChange = vi.fn();
    renderDialog({ onNotifyMembersChange });

    fireEvent.click(
      screen.getByRole("checkbox", { name: /Nhắn riêng từng người/ })
    );

    expect(onNotifyMembersChange).toHaveBeenCalledWith(false);
  });

  describe("sau khi đã đăng vào channel", () => {
    const report = {
      sentCount: 1,
      totalCount: 3,
      blocked: [],
      missingDiscordId: [{ characterId: "k", name: "Klein", matchIndex: 1 }],
      notPresent: [{ characterId: "s", name: "Sinon", matchIndex: 2 }],
      unsent: [],
    };

    it("đang nhắn thì nói đang nhắn và không còn nút gửi", () => {
      renderDialog({ outcome: { report: null, error: null }, sending: true });

      expect(screen.getByText(/Đang nhắn riêng/)).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Gửi thông báo/ })).toBeNull();
    });

    it("hiện đã nhắn bao nhiêu trên tổng", () => {
      renderDialog({ outcome: { report, error: null } });

      expect(screen.getByText("Đã nhắn riêng 1/3")).toBeTruthy();
    });

    it("liệt kê tên và trận của người không nhận được, theo từng lý do", () => {
      renderDialog({ outcome: { report, error: null } });

      expect(screen.getByText(/Chưa có Discord ID \(1\)/)).toBeTruthy();
      expect(screen.getByText("Klein - trận 1")).toBeTruthy();
      expect(screen.getByText(/Chưa điểm danh Có \(1\)/)).toBeTruthy();
      expect(screen.getByText("Sinon - trận 2")).toBeTruthy();
    });

    it("người chặn tin nhắn từ bot và người chưa nhắn được có nhóm riêng", () => {
      renderDialog({
        outcome: {
          report: {
            ...report,
            blocked: [{ characterId: "a", name: "Asuna", matchIndex: 1 }],
            unsent: [{ characterId: "r", name: "Rika", matchIndex: 2 }],
          },
          error: null,
        },
      });

      expect(screen.getByText(/Chặn tin nhắn từ bot \(1\)/)).toBeTruthy();
      expect(screen.getByText("Asuna - trận 1")).toBeTruthy();
      expect(screen.getByText(/Chưa nhắn được \(1\)/)).toBeTruthy();
      expect(screen.getByText("Rika - trận 2")).toBeTruthy();
    });

    it("không hiện nhóm rỗng", () => {
      renderDialog({ outcome: { report, error: null } });

      expect(screen.queryByText(/Chặn tin nhắn từ bot/)).toBeNull();
    });

    it("cả request lỗi thì hiện câu lỗi và nói tin channel đã đăng", () => {
      renderDialog({
        outcome: { report: null, error: "Không nhắn riêng được." },
      });

      expect(screen.getByText("Không nhắn riêng được.")).toBeTruthy();
      expect(screen.getByText(/đã đăng vào channel/)).toBeTruthy();
    });

    it("có người chưa nhắn được thì có nút nhắn lại người lỗi", () => {
      const onRetry = vi.fn();
      renderDialog({
        outcome: {
          report: {
            ...report,
            unsent: [{ characterId: "r", name: "Rika", matchIndex: 2 }],
          },
          error: null,
        },
        onRetry,
      });

      fireEvent.click(
        screen.getByRole("button", { name: /Nhắn lại người lỗi/ })
      );

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("không ai chưa nhắn được thì không có nút nhắn lại", () => {
      renderDialog({ outcome: { report, error: null } });

      expect(screen.queryByRole("button", { name: /Nhắn lại/ })).toBeNull();
    });

    it("cả request lỗi thì có nút thử lại", () => {
      const onRetry = vi.fn();
      renderDialog({
        outcome: { report: null, error: "Mất kết nối." },
        onRetry,
      });

      fireEvent.click(screen.getByRole("button", { name: /Thử lại/ }));

      expect(onRetry).toHaveBeenCalledOnce();
    });

    it("đang nhắn lại thì khoá nút nhắn lại", () => {
      renderDialog({
        outcome: {
          report: {
            ...report,
            unsent: [{ characterId: "r", name: "Rika", matchIndex: 2 }],
          },
          error: null,
        },
        sending: true,
      });

      const button = screen.getByRole("button", {
        name: /Nhắn lại người lỗi|Đang nhắn/,
      }) as HTMLButtonElement;

      expect(button.disabled).toBe(true);
    });

    it("có nút Đóng", () => {
      const onOpenChange = vi.fn();
      renderDialog({ outcome: { report, error: null }, onOpenChange });

      fireEvent.click(screen.getByRole("button", { name: "Đóng" }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("đóng dialog khi đang gửi", () => {
    it("Esc không đóng được lúc đang chụp và đăng, vì ảnh chụp nằm ngoài dialog", () => {
      const onOpenChange = vi.fn();
      renderDialog({ sending: true, onOpenChange });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("Esc không đóng được lúc đang nhắn riêng, nếu không báo cáo sẽ lạc", () => {
      const onOpenChange = vi.fn();
      renderDialog({
        outcome: { report: null, error: null },
        sending: true,
        onOpenChange,
      });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("không có nút X ở góc khi đang gửi", () => {
      renderDialog({ sending: true });

      expect(screen.queryByRole("button", { name: /^Close$|^Đóng$/ })).toBeNull();
    });

    it("hết gửi thì Esc đóng được", () => {
      const onOpenChange = vi.fn();
      renderDialog({ sending: false, onOpenChange });

      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

      expect(onOpenChange.mock.calls[0][0]).toBe(false);
    });
  });
});
