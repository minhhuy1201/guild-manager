// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FocusModeShell } from "../focus-mode-shell";

afterEach(cleanup);

function renderShell(
  props: {
    active?: boolean;
    onExit?: () => void;
    activeSlot?: string;
    activeClassName?: string;
    barClassName?: string;
  } = {}
) {
  return render(
    <FocusModeShell
      active={props.active ?? true}
      label="Toàn màn hình"
      bar={
        <div role="tablist">
          <button type="button" role="tab" tabIndex={-1}>
            Một
          </button>
          <button type="button" role="tab" tabIndex={0}>
            Hai
          </button>
        </div>
      }
      onExit={props.onExit ?? vi.fn()}
      activeSlot={props.activeSlot}
      activeClassName={props.activeClassName}
      barClassName={props.barClassName}
    >
      <button type="button">Nội dung</button>
    </FocusModeShell>
  );
}

describe("FocusModeShell", () => {
  it("là dialog modal có tên khi active, và nhận focus", () => {
    renderShell();

    const dialog = screen.getByRole("dialog", { name: "Toàn màn hình" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
  });

  it("không phải dialog khi inactive, vẫn hiện nội dung", () => {
    renderShell({ active: false });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Nội dung" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Thoát toàn màn hình" })).toBeNull();
  });

  it("gắn data-slot và class riêng lên gốc khi active, và bỏ chúng khi inactive", () => {
    const { rerender } = renderShell({ activeSlot: "my-slot", activeClassName: "my-active" });
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("data-slot")).toBe("my-slot");
    expect(dialog.classList.contains("my-active")).toBe(true);

    rerender(
      <FocusModeShell
        active={false}
        label="Toàn màn hình"
        bar={null}
        onExit={vi.fn()}
        activeSlot="my-slot"
        activeClassName="my-active"
        className="plain"
      >
        <button type="button">Nội dung</button>
      </FocusModeShell>
    );
    const root = screen.getByRole("button", { name: "Nội dung" }).parentElement?.parentElement;
    expect(root?.hasAttribute("data-slot")).toBe(false);
    expect(root?.classList.contains("my-active")).toBe(false);
    expect(root?.classList.contains("plain")).toBe(true);
  });

  it("để activeClassName thắng nền mặc định của khung", () => {
    renderShell({ activeClassName: "bg-[color:var(--x)]" });

    const classes = screen.getByRole("dialog").className.split(" ");
    expect(classes).toContain("bg-[color:var(--x)]");
    expect(classes).not.toContain("bg-background");
  });

  it("nút thoát gọi onExit", () => {
    const onExit = vi.fn();
    renderShell({ onExit });

    fireEvent.click(screen.getByRole("button", { name: "Thoát toàn màn hình" }));

    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it("Tab từ nút cuối vòng về tab đang chọn, bỏ qua tab không phải điểm dừng", () => {
    renderShell();
    const last = screen.getByRole("button", { name: "Nội dung" });
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Hai" }));
  });

  it("Shift+Tab từ tab đầu vòng về nút cuối", () => {
    renderShell();
    const first = screen.getByRole("tab", { name: "Hai" });
    first.focus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Nội dung" })
    );
  });

  it("ẩn nút thoát bằng data-idle nhưng vẫn focus được khi hideExit", () => {
    render(
      <FocusModeShell active label="x" bar={null} onExit={vi.fn()} hideExit>
        <div />
      </FocusModeShell>
    );

    const exit = screen.getByRole("button", { name: "Thoát toàn màn hình" });
    expect(exit.hasAttribute("data-idle")).toBe(true);
    expect(exit.tabIndex).toBe(0);
  });

  it("không mount lại con khi active đổi false -> true -> false", () => {
    const mounts = vi.fn();
    function Probe() {
      useEffect(() => mounts(), []);
      return <span>probe</span>;
    }
    const tree = (active: boolean) => (
      <FocusModeShell active={active} label="x" bar={<span />} onExit={vi.fn()}>
        <Probe />
      </FocusModeShell>
    );

    const { rerender } = render(tree(false));
    rerender(tree(true));
    rerender(tree(false));

    expect(mounts).toHaveBeenCalledTimes(1);
  });
});
