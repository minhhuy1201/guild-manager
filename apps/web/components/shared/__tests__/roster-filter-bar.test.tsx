// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { RosterFilter } from "@/lib/roster-filter";

import { RosterFilterBar } from "../roster-filter-bar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
// Base UI positions the class picker's popup through floating-ui, which watches the anchor.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

/** The search box, found the way a user finds it — by its label. */
function searchBox(): HTMLInputElement {
  return screen.getByLabelText("Tìm kiếm") as HTMLInputElement;
}

/** The search box's clear button, or null while it is not offered. */
function clearButton(): HTMLElement | null {
  return screen.queryByLabelText("Xoá từ khoá");
}

interface HarnessProps {
  /** Filter the bar starts with. */
  initial?: RosterFilter;
}

/**
 * The bar wired to real state, so a clear is observed through what the bar renders next rather
 * than through the callback alone.
 * @param initial - Filter the bar starts with
 * @returns The controlled bar
 */
function Harness({ initial = { search: "", guildClasses: [] } }: HarnessProps) {
  const [value, setValue] = useState(initial);

  return <RosterFilterBar idPrefix="test" value={value} onChange={setValue} />;
}

describe("RosterFilterBar - xoá từ khoá", () => {
  it("ô rỗng thì không có nút xoá — không có gì để xoá", () => {
    render(<Harness />);

    expect(clearButton()).toBeNull();
  });

  it("gõ một chữ là nút xoá hiện ra", () => {
    render(<Harness />);

    fireEvent.change(searchBox(), { target: { value: "mèo" } });

    expect(clearButton()).not.toBeNull();
  });

  it("bấm xoá thì ô trống lại và nút tự biến mất", () => {
    render(<Harness initial={{ search: "mèo", guildClasses: [] }} />);

    fireEvent.click(clearButton() as HTMLElement);

    expect(searchBox().value).toBe("");
    expect(clearButton()).toBeNull();
  });

  it("xoá xong thì con trỏ quay lại ô tìm kiếm, không rơi xuống body", () => {
    render(<Harness initial={{ search: "mèo", guildClasses: [] }} />);

    fireEvent.click(clearButton() as HTMLElement);

    expect(document.activeElement).toBe(searchBox());
  });

  it("xoá từ khoá không đụng tới lưu phái đang lọc", () => {
    const onChange = vi.fn();
    render(
      <RosterFilterBar
        idPrefix="test"
        value={{ search: "mèo", guildClasses: [GuildClass.CUU_LINH] }}
        onChange={onChange}
      />
    );

    fireEvent.click(clearButton() as HTMLElement);

    expect(onChange).toHaveBeenCalledWith({
      search: "",
      guildClasses: [GuildClass.CUU_LINH],
    });
  });

  it("ô tìm kiếm chừa sẵn chỗ bên phải, kể cả khi chưa có nút xoá", () => {
    render(<Harness />);

    // Padding cố định: nếu chỉ chừa chỗ lúc nút hiện ra thì chữ trong ô nhảy ngay khi gõ chữ đầu.
    expect(searchBox().className).toContain("pr-10");
  });
});
