// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Capability, GuildRole } from "@guild/shared/enums";

vi.mock("../components/attendance-filters", () => ({
  AttendanceFilters: () => <div data-testid="filters" />,
}));
vi.mock("../components/attendance-grid", () => ({
  AttendanceGrid: ({ canManageOthers }: { canManageOthers: boolean }) => (
    <div data-testid="grid" data-admin={String(canManageOthers)} />
  ),
}));
vi.mock("../components/leave-section", () => ({
  LeaveSection: ({ canManageOthers }: { canManageOthers: boolean }) => (
    <div data-testid="leave" data-admin={String(canManageOthers)} />
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
    render(<AttendanceScreen actor={{ role: GuildRole.MEMBER }} />);

    expect(screen.getByTestId("member-card")).toBeTruthy();
    expect(screen.getByTestId("grid").dataset.admin).toBe("false");
  });

  // The week schedule folded into the personal card and the filters into the table's card: the page
  // is down to two blocks.
  it("mục xin nghỉ, rồi thẻ tuần của bạn, rồi card bảng, không còn thẻ lọc riêng", () => {
    const { container } = render(<AttendanceScreen actor={{ role: GuildRole.MEMBER }} />);
    const order = [...container.querySelectorAll("[data-testid]")].map(
      (node) => node.getAttribute("data-testid")
    );

    expect(order).toEqual(["leave", "member-card", "grid"]);
  });

  it("admin cũng thấy thẻ cá nhân, và lưới cho sửa được", () => {
    render(<AttendanceScreen actor={{ role: GuildRole.ADMIN }} />);

    expect(screen.getByTestId("member-card")).toBeTruthy();
    expect(screen.getByTestId("grid").dataset.admin).toBe("true");
  });

  it("Manager có Điểm danh & nghỉ phép được sửa lưới và xin nghỉ hộ", () => {
    render(
      <AttendanceScreen
        actor={{ role: GuildRole.MANAGER, capabilities: [Capability.ATTENDANCE] }}
      />
    );

    expect(screen.getByTestId("grid").dataset.admin).toBe("true");
    expect(screen.getByTestId("leave").dataset.admin).toBe("true");
  });

  it("Manager chỉ có Capability khác, hay chưa có Grant nào, chạy y hệt member", () => {
    for (const capabilities of [[], [Capability.SCHEDULE, Capability.TACTICS]]) {
      cleanup();
      render(
        <AttendanceScreen actor={{ role: GuildRole.MANAGER, capabilities }} />
      );

      expect(screen.getByTestId("grid").dataset.admin).toBe("false");
      expect(screen.getByTestId("leave").dataset.admin).toBe("false");
    }
  });
});
