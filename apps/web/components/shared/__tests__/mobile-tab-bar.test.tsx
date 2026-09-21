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
  // On a phone the "Điểm danh" and "Lịch sử" icons are hard to tell apart, so every item needs its
  // text.
  it("member thấy ba mục, mục nào cũng có chữ", () => {
    render(<MobileTabBar isAdmin={false} />);

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử", "Chiến thuật"]);
  });

  it("admin thấy thêm Xếp team và Thiết lập", () => {
    render(<MobileTabBar isAdmin />);

    expect(tabLabels()).toEqual([
      "Điểm danh",
      "Lịch sử",
      "Xếp team",
      "Chiến thuật",
      "Thiết lập",
    ]);
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

  // globals.css only reserves bottom room for the page when this bar is present, and it finds the
  // bar through this attribute.
  it("mang data-slot mà globals.css dựa vào để chừa khoảng đáy", () => {
    const { container } = render(<MobileTabBar isAdmin={false} />);

    expect(container.querySelector('[data-slot="mobile-tab-bar"]')).not.toBeNull();
  });
});
