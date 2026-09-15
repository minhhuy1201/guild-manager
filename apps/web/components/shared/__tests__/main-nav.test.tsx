// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

vi.mock("next/navigation", () => ({ usePathname: () => ROUTES.attendance }));

import { MainNav } from "../main-nav";

afterEach(cleanup);

// Từ sm tới lg (điện thoại xoay ngang, tablet) bốn nhãn đầy đủ ép mất tên bang trên header, nên ở
// đó nav dùng nhãn ngắn. Screen reader vẫn đọc tên đầy đủ.
describe("MainNav - nhãn ngắn dưới lg", () => {
  it("mục có nhãn ngắn: tên truy cập là nhãn đầy đủ, dưới lg hiện chữ ngắn", () => {
    render(<MainNav isAdmin={false} />);

    const link = screen.getByRole("link", { name: "Lịch sử điểm danh" });

    expect(within(link).getByText("Lịch sử").className).toContain("lg:hidden");
    expect(within(link).getByText("Lịch sử điểm danh").className).toContain(
      "max-lg:hidden"
    );
  });

  it("mục có nhãn ngắn trùng nhãn đầy đủ thì chỉ hiện chữ một lần", () => {
    render(<MainNav isAdmin={false} />);

    const link = screen.getByRole("link", { name: "Điểm danh" });

    expect(within(link).getAllByText("Điểm danh")).toHaveLength(1);
  });
});
