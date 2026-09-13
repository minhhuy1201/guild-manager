// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

let pathname: string = ROUTES.attendance;

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { MobileTabBar } from "../mobile-tab-bar";

afterEach(cleanup);

beforeEach(() => {
  pathname = ROUTES.attendance;
});

/**
 * The visible names of every tab, in order.
 * @returns The tab labels
 */
function tabLabels(): string[] {
  return screen.getAllByRole("link").map((link) => link.textContent ?? "");
}

describe("MobileTabBar", () => {
  // Trên điện thoại hai icon Điểm danh và Lịch sử khó phân biệt, nên mục nào cũng phải có chữ.
  it("member thấy hai mục, mục nào cũng có chữ", () => {
    render(<MobileTabBar isAdmin={false} />);

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử"]);
  });

  it("admin thấy thêm Xếp team và Thiết lập", () => {
    render(<MobileTabBar isAdmin />);

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử", "Xếp team", "Thiết lập"]);
  });

  it("mục đang mở được đánh dấu là trang hiện tại", () => {
    pathname = ROUTES.attendanceHistory;

    render(<MobileTabBar isAdmin={false} />);

    expect(
      screen.getByRole("link", { name: "Lịch sử" }).getAttribute("aria-current")
    ).toBe("page");
    expect(
      screen.getByRole("link", { name: "Điểm danh" }).getAttribute("aria-current")
    ).toBeNull();
  });

  // globals.css chỉ chừa khoảng đáy cho trang khi thanh này có mặt, và tìm nó qua thuộc tính này.
  it("mang data-slot mà globals.css dựa vào để chừa khoảng đáy", () => {
    const { container } = render(<MobileTabBar isAdmin={false} />);

    expect(container.querySelector('[data-slot="mobile-tab-bar"]')).not.toBeNull();
  });
});
