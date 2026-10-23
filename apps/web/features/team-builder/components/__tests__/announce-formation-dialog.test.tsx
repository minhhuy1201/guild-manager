// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnnounceFormationDialog } from "../announce-formation-dialog";

afterEach(cleanup);

/** A 20:30 scrim played over two matches, the fields the preview reads. */
const SESSION = {
  isGuildWar: false,
  dateTime: "2026-08-19T13:30:00.000Z",
  matchCount: 2,
};

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
      session={SESSION}
      note=""
      onNoteChange={vi.fn()}
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

describe("AnnounceFormationDialog - xem trước", () => {
  it("tin kênh hiện lưu ý dạng quote dưới tiêu đề, trên các dòng luật", () => {
    renderDialog({ note: "Đổi map trận 2" });

    const preview = screen.getByRole("region", { name: "Xem trước tin Discord" });
    const quote = within(preview).getByText("Đổi map trận 2").closest("blockquote");
    const text = preview.textContent ?? "";

    expect(quote).toBeTruthy();
    expect(text.indexOf("SCRIM 20:30 19/08")).toBeLessThan(text.indexOf("Đổi map trận 2"));
    expect(text.indexOf("Đổi map trận 2")).toBeLessThan(text.indexOf("Các thành viên"));
  });

  it("không có lưu ý thì không có khung quote", () => {
    renderDialog();

    expect(document.querySelector("blockquote")).toBeNull();
  });

  it("mention kênh và role hiện thành pill, không lộ id giữ chỗ", () => {
    renderDialog();

    expect(screen.getByText("#🤒│báo-bận")).toBeTruthy();
    expect(screen.getByText("@Bang")).toBeTruthy();
    expect(document.body.textContent).not.toContain("preview-");
  });

  it("ô giữ chỗ ảnh: một ô mỗi trận dưới tin kênh", () => {
    renderDialog();

    expect(screen.getByText("doi-hinh-1.webp")).toBeTruthy();
    expect(screen.getByText("doi-hinh-2.webp")).toBeTruthy();
  });

  it("tab nhắn riêng chỉ có khi bật nhắn riêng từng người", () => {
    renderDialog({ notifyMembers: false });
    expect(screen.queryByRole("tab", { name: /Nhắn riêng/ })).toBeNull();

    cleanup();
    renderDialog({ notifyMembers: true });
    expect(screen.getByRole("tab", { name: /Nhắn riêng/ })).toBeTruthy();
  });

  it("tab nhắn riêng hiện DM mẫu của team 1 trận 1 kèm lưu ý và ảnh card", () => {
    renderDialog({ note: "Mang giáp" });

    fireEvent.click(screen.getByRole("tab", { name: /Nhắn riêng/ }));

    const preview = screen.getByRole("region", { name: "Xem trước tin Discord" });

    expect(within(preview).getByText(/Bạn ở/)).toBeTruthy();
    expect(within(preview).getByText("Mang giáp").closest("blockquote")).toBeTruthy();
    expect(within(preview).getByText("team-1-tran-1.webp")).toBeTruthy();
  });
});

describe("AnnounceFormationDialog - lưu ý thêm", () => {
  it("có ô Lưu ý thêm với bộ đếm theo giới hạn 500", () => {
    renderDialog({ note: "Đổi map" });

    const field = screen.getByLabelText("Lưu ý thêm") as HTMLTextAreaElement;

    expect(field.value).toBe("Đổi map");
    expect(field.maxLength).toBe(500);
    expect(screen.getByText("7/500")).toBeTruthy();
  });

  it("gõ vào ô thì báo lên onNoteChange", () => {
    const onNoteChange = vi.fn();
    renderDialog({ onNoteChange });

    fireEvent.change(screen.getByLabelText("Lưu ý thêm"), {
      target: { value: "Online sớm" },
    });

    expect(onNoteChange).toHaveBeenCalledWith("Online sớm");
  });

  it("đang gửi thì khoá ô lưu ý", () => {
    renderDialog({ sending: true });

    expect((screen.getByLabelText("Lưu ý thêm") as HTMLTextAreaElement).disabled).toBe(
      true
    );
  });
});

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
