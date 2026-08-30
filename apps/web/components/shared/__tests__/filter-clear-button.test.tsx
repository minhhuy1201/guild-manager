// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterClearButton } from "../filter-clear-button";

afterEach(cleanup);

/**
 * The rendered clear button.
 * @returns The button element
 */
function clearButton(): HTMLElement {
  return screen.getByLabelText("Xoá từ khoá");
}

describe("FilterClearButton", () => {
  it("bấm là gọi onClear đúng một lần", () => {
    const onClear = vi.fn();
    render(<FilterClearButton label="Xoá từ khoá" onClear={onClear} />);

    fireEvent.click(clearButton());

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("không tự căn giữa bằng transform", () => {
    // `Button` đã dùng `--tw-translate-y` cho hiệu ứng nhấn
    // (`active:not-aria-[haspopup]:translate-y-px`). Một `-translate-y-1/2` để căn giữa sẽ bị đè
    // ngay khi con trỏ nhấn xuống: nút tụt xuống gần nửa chiều cao của nó, con trỏ rơi ra ngoài
    // nút, và trình duyệt không phát `click` — người dùng phải bấm lần thứ hai.
    render(<FilterClearButton label="Xoá từ khoá" onClear={vi.fn()} />);

    expect(clearButton().className).not.toContain("translate-y-1/2");
  });

  it("vẫn giữ hiệu ứng nhấn của Button", () => {
    render(<FilterClearButton label="Xoá từ khoá" onClear={vi.fn()} />);

    expect(clearButton().className).toContain("translate-y-px");
  });

  it("offset ngang nằm trên khung bọc, không nằm trên nút", () => {
    const { container } = render(
      <FilterClearButton
        label="Xoá từ khoá"
        onClear={vi.fn()}
        className="right-8"
      />
    );

    expect(container.firstElementChild?.className).toContain("right-8");
    expect(clearButton().className).not.toContain("right-8");
  });

  it("khung bọc căn giữa theo chiều dọc bằng flex, không bằng transform", () => {
    const { container } = render(
      <FilterClearButton label="Xoá từ khoá" onClear={vi.fn()} />
    );
    const wrapper = container.firstElementChild as HTMLElement;

    expect(wrapper.className).toContain("inset-y-0");
    expect(wrapper.className).toContain("items-center");
    expect(wrapper.className).not.toContain("translate");
  });

  it("chỉ có tên cho trình đọc màn hình, không có chữ hiện ra", () => {
    render(<FilterClearButton label="Xoá từ khoá" onClear={vi.fn()} />);

    expect(clearButton().textContent).toBe("");
  });
});
