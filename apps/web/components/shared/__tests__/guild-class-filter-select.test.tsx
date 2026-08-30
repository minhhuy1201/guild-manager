// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";

import { GuildClassFilterSelect } from "../guild-class-filter-select";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

afterEach(cleanup);

/** The picker's trigger — the button a `<Label htmlFor>` points at. */
function trigger(): HTMLElement {
  return document.querySelector(
    "[data-slot='select-trigger']"
  ) as HTMLElement;
}

describe("GuildClassFilterSelect - nút xoá", () => {
  it("một cú click là xoá xong bộ lọc lưu phái", async () => {
    const onChange = vi.fn();
    render(
      <GuildClassFilterSelect
        id="test"
        value={[GuildClass.CUU_LINH]}
        onChange={onChange}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Xoá lọc lưu phái"));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("chưa lọc gì thì không có nút xoá", () => {
    render(<GuildClassFilterSelect id="test" value={[]} onChange={vi.fn()} />);

    expect(screen.queryByLabelText("Xoá lọc lưu phái")).toBeNull();
  });

  it("xoá xong thì con trỏ quay về trigger, không rơi xuống body", async () => {
    render(
      <GuildClassFilterSelect
        id="test"
        value={[GuildClass.CUU_LINH]}
        onChange={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Xoá lọc lưu phái"));
    });

    expect(document.activeElement).toBe(trigger());
  });

  it("nút xoá là phần tử anh em, không nằm trong trigger", () => {
    // Trigger tự nó là một <button>; lồng button trong button là markup trình duyệt sẽ xé ra.
    render(
      <GuildClassFilterSelect
        id="test"
        value={[GuildClass.CUU_LINH]}
        onChange={vi.fn()}
      />
    );

    expect(trigger().contains(screen.getByLabelText("Xoá lọc lưu phái"))).toBe(
      false
    );
  });

  it("có nút xoá thì trigger vẫn giữ nguyên lề phải của chính nó", () => {
    // Lề phải của trigger là chỗ đứng của mũi tên chevron, không phải chỗ đứng của chữ: nới nó ra
    // thì chevron bị đẩy vào trong và để lại một khoảng trắng ở mép phải.
    render(
      <GuildClassFilterSelect
        id="test"
        value={[GuildClass.CUU_LINH]}
        onChange={vi.fn()}
      />
    );

    expect(trigger().className).toContain("pr-2.5");
  });

  it("chỗ cho nút xoá được chừa trên phần hiển thị giá trị, không trên trigger", () => {
    const { rerender } = render(
      <GuildClassFilterSelect id="test" value={[]} onChange={vi.fn()} />
    );

    expect(trigger().className).not.toContain("select-value]:mr-9");

    rerender(
      <GuildClassFilterSelect
        id="test"
        value={[GuildClass.CUU_LINH]}
        onChange={vi.fn()}
      />
    );

    expect(trigger().className).toContain("select-value]:mr-9");
  });
});
