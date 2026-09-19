// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FormationToolbar } from "../formation-toolbar";

afterEach(cleanup);

/**
 * Render the toolbar of an editable day that has a copy source.
 * @param props - Fields to change from the default
 * @returns Nothing
 */
function renderToolbar(
  props: Partial<React.ComponentProps<typeof FormationToolbar>> = {}
) {
  render(
    <FormationToolbar
      dirty={false}
      saving={false}
      editable
      copySourceLabel="Thứ 7 · Bang Chiến"
      canCopy
      onCopy={vi.fn()}
      announcing={false}
      onAnnounce={vi.fn()}
      {...props}
    />
  );
}

/**
 * Read the copy button off the rendered toolbar.
 * @param name - Accessible name to match
 * @returns The button element
 */
function copyButton(name: RegExp): HTMLButtonElement {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("FormationToolbar — nút copy đội hình", () => {
  it("nói rõ ngày nguồn trên nhãn nút", () => {
    renderToolbar();

    expect(copyButton(/Copy từ Thứ 7 · Bang Chiến/).disabled).toBe(false);
  });

  it("không có nguồn thì nút bị khoá và về nhãn chung", () => {
    renderToolbar({ copySourceLabel: null, canCopy: false });

    expect(copyButton(/Copy đội hình/).disabled).toBe(true);
  });

  it("bấm nút thì gọi onCopy", () => {
    const onCopy = vi.fn();
    renderToolbar({ onCopy });

    fireEvent.click(copyButton(/Copy từ/));

    expect(onCopy).toHaveBeenCalledOnce();
  });

  it("đang lưu thì không copy được", () => {
    renderToolbar({ saving: true });

    expect(copyButton(/Copy từ/).disabled).toBe(true);
  });

  it("ngày đã đánh xong thì không có nút nào", () => {
    renderToolbar({ editable: false });

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("FormationToolbar — nút gửi Discord", () => {
  it("bấm nút thì gọi onAnnounce", () => {
    const onAnnounce = vi.fn();
    renderToolbar({ onAnnounce });

    fireEvent.click(screen.getByRole("button", { name: /Gửi Discord/ }));

    expect(onAnnounce).toHaveBeenCalledOnce();
  });

  it("đang gửi thì khoá nút và nói đang gửi", () => {
    renderToolbar({ announcing: true });

    const button = screen.getByRole("button", {
      name: /Đang gửi/,
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });

  // Once a match has been played there is nothing left to announce.
  it("ngày đã đánh xong thì không có nút gửi", () => {
    renderToolbar({ editable: false });

    expect(screen.queryByRole("button", { name: /Gửi Discord/ })).toBeNull();
  });

  // The image that goes out has to be the saved line-up, so block at the button rather than waiting
  // for the dialog to say so.
  it("còn thay đổi chưa lưu thì khoá nút gửi", () => {
    renderToolbar({ dirty: true });

    const button = screen.getByRole("button", {
      name: /Gửi Discord/,
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});

// A phone has no hover to open a tooltip, and the full copy label takes up nearly the whole
// screen.
describe("FormationToolbar - dùng được bằng tay trên điện thoại", () => {
  it("còn thay đổi chưa lưu thì dòng 'Lưu trước khi gửi' hiện bằng chữ", () => {
    renderToolbar({ dirty: true });

    expect(screen.getByText("Lưu trước khi gửi")).toBeTruthy();
  });

  it("đã lưu hết thì không có dòng nhắc lưu", () => {
    renderToolbar();

    expect(screen.queryByText("Lưu trước khi gửi")).toBeNull();
  });

  it("nút copy có tên truy cập đầy đủ, dưới sm hiện chữ ngắn", () => {
    renderToolbar();

    const button = screen.getByRole("button", {
      name: "Copy từ Thứ 7 · Bang Chiến",
    });

    expect(within(button).getByText("Copy đội hình").className).toContain(
      "sm:hidden"
    );
    expect(
      within(button).getByText("Copy từ Thứ 7 · Bang Chiến").className
    ).toContain("max-sm:hidden");
  });
});

describe("FormationToolbar - lưu và đặt lại", () => {
  // These two buttons live in the bar stuck to the bottom, so they stay visible wherever the page
  // is scrolled.
  it("không còn nút Lưu và Đặt lại ở toolbar", () => {
    renderToolbar({ dirty: true });

    expect(screen.queryByRole("button", { name: /^Lưu$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Đặt lại/ })).toBeNull();
  });
});
