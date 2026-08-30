// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildRole } from "@guild/shared/enums";

vi.mock("../components/week-timeline", () => ({
  WeekTimeline: () => <div data-testid="week-timeline" />,
}));
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

import { AttendanceScreen } from "../components/attendance-screen";

afterEach(cleanup);

describe("AttendanceScreen", () => {
  it("member thấy thẻ của mình rồi tới bộ lọc và lưới chỉ đọc", () => {
    render(<AttendanceScreen role={GuildRole.MEMBER} />);

    expect(screen.getByTestId("member-card")).toBeTruthy();
    expect(screen.getByTestId("filters")).toBeTruthy();
    expect(screen.getByTestId("grid").dataset.admin).toBe("false");
  });

  it("thẻ cá nhân nằm trên bộ lọc và lưới", () => {
    const { container } = render(<AttendanceScreen role={GuildRole.MEMBER} />);
    const order = [...container.querySelectorAll("[data-testid]")].map(
      (node) => node.getAttribute("data-testid")
    );

    expect(order).toEqual(["week-timeline", "member-card", "filters", "grid"]);
  });

  it("admin không thấy thẻ cá nhân và lưới cho sửa được", () => {
    render(<AttendanceScreen role={GuildRole.ADMIN} />);

    expect(screen.queryByTestId("member-card")).toBeNull();
    expect(screen.getByTestId("grid").dataset.admin).toBe("true");
  });
});
