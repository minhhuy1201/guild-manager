// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildRole } from "@guild/shared/enums";

vi.mock("../components/attendance-filters", () => ({
  AttendanceFilters: () => <div data-testid="filters" />,
}));
vi.mock("../components/attendance-grid", () => ({
  AttendanceGrid: ({ isAdmin }: { isAdmin: boolean }) => (
    <div data-testid="grid" data-admin={String(isAdmin)} />
  ),
}));
vi.mock("../components/member-attendance-card", () => ({
  MemberAttendanceCard: () => <div data-testid="member-card" />,
}));
// The scene is next/image; what is under test is which blocks the screen stacks.
vi.mock("@/components/shared/banner-image", () => ({ BannerImage: () => null }));

import { AttendanceScreen } from "../components/attendance-screen";

afterEach(cleanup);

describe("AttendanceScreen", () => {
  it("member thấy thẻ của mình rồi tới lưới chỉ đọc", () => {
    render(<AttendanceScreen role={GuildRole.MEMBER} />);

    expect(screen.getByTestId("member-card")).toBeTruthy();
    expect(screen.getByTestId("grid").dataset.admin).toBe("false");
  });

  // Lịch tuần đã gộp vào thẻ cá nhân, và bộ lọc đã vào card của bảng: trang chỉ còn hai khối.
  it("thẻ tuần của bạn đứng đầu, rồi tới card bảng, không còn thẻ lọc riêng", () => {
    const { container } = render(<AttendanceScreen role={GuildRole.MEMBER} />);
    const order = [...container.querySelectorAll("[data-testid]")].map(
      (node) => node.getAttribute("data-testid")
    );

    expect(order).toEqual(["member-card", "grid"]);
  });

  it("admin cũng thấy thẻ cá nhân, và lưới cho sửa được", () => {
    render(<AttendanceScreen role={GuildRole.ADMIN} />);

    expect(screen.getByTestId("member-card")).toBeTruthy();
    expect(screen.getByTestId("grid").dataset.admin).toBe("true");
  });
});
