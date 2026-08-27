// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TablePagination, getPageSlots } from "../table-pagination";

afterEach(cleanup);

/** Number of cells in the strip when siblings = 1 (siblings * 2 + 5). */
const TOTAL_SLOTS = 7;

describe("getPageSlots", () => {
  it("luôn trả về đúng TOTAL_SLOTS ô ở mọi trang", () => {
    const pageCount = 8;
    for (let page = 1; page <= pageCount; page++) {
      expect(getPageSlots(page, pageCount, 1)).toHaveLength(TOTAL_SLOTS);
    }
  });

  it("đệm ở cuối khi tổng số trang còn nhỏ hơn số ô", () => {
    expect(getPageSlots(1, 3, 1)).toEqual([
      1,
      2,
      3,
      "blank",
      "blank",
      "blank",
      "blank",
    ]);
  });

  it("thiếu ở phía phải thì đệm ngay trước dấu ba chấm cuối", () => {
    expect(getPageSlots(1, 8, 1)).toEqual([
      1,
      2,
      "blank",
      "blank",
      "blank",
      "ellipsis",
      8,
    ]);
  });

  it("thiếu ở phía trái thì đệm ngay sau dấu ba chấm đầu", () => {
    expect(getPageSlots(8, 8, 1)).toEqual([
      1,
      "ellipsis",
      "blank",
      "blank",
      "blank",
      7,
      8,
    ]);
  });

  it("giữ nguyên chỉ số ô của số trang giữa hai trang liền nhau", () => {
    const atThree = getPageSlots(3, 8, 1);
    const atFour = getPageSlots(4, 8, 1);
    expect(atThree.indexOf(3)).toBe(atFour.indexOf(3));
    expect(atThree.indexOf(4)).toBe(atFour.indexOf(4));
  });

  it("một trang duy nhất vẫn ra đủ số ô", () => {
    expect(getPageSlots(1, 1, 1)).toHaveLength(TOTAL_SLOTS);
  });
});

describe("TablePagination", () => {
  it("giữ nguyên vị trí nút 'Trang sau' khi đổi trang", () => {
    const { container, rerender } = render(
      <TablePagination page={1} pageCount={8} onPageChange={() => {}} />
    );
    const indexOfNext = () => {
      const items = Array.from(container.querySelectorAll("li"));
      return items.findIndex(
        (item) => item.querySelector('[aria-label="Trang sau"]') !== null
      );
    };

    const atPageOne = indexOfNext();
    rerender(
      <TablePagination page={4} pageCount={8} onPageChange={() => {}} />
    );

    expect(indexOfNext()).toBe(atPageOne);
    expect(atPageOne).toBeGreaterThan(-1);
  });

  it("vẫn render khi chỉ có một trang, bốn nút điều hướng đều bị chặn", () => {
    render(<TablePagination page={1} pageCount={1} onPageChange={() => {}} />);

    for (const label of [
      "Về trang đầu",
      "Trang trước",
      "Trang sau",
      "Về trang cuối",
    ]) {
      expect(screen.getByLabelText(label).getAttribute("aria-disabled")).toBe(
        "true"
      );
    }
  });
});
