// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Capability, GuildRole } from "@guild/shared/enums";
import type { Actor } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

const MEMBER: Actor = { role: GuildRole.MEMBER };
const ADMIN: Actor = { role: GuildRole.ADMIN };

let pathname: string = ROUTES.attendance;

vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

// Link's `transitionTypes` never reaches the DOM, so the stub exposes it for the tests to read.
vi.mock("next/link", () => ({
  default: ({
    transitionTypes,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    transitionTypes?: string[];
  }) => (
    <a {...rest} data-transition-types={transitionTypes?.join(" ")}>
      {children}
    </a>
  ),
}));

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
  // text. "Xếp team" and "Chiến thuật" are desktop-only: drag-and-drop and the map need a wide screen.
  it("member thấy hai mục, mục nào cũng có chữ", () => {
    render(<MobileTabBar actor={MEMBER} />);

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử"]);
  });

  it("admin thấy thêm Thiết lập, không có Xếp team và Chiến thuật", () => {
    render(<MobileTabBar actor={ADMIN} />);

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử", "Thiết lập"]);
  });

  it("mục đang mở được đánh dấu là trang hiện tại", () => {
    pathname = ROUTES.attendanceHistory;

    render(<MobileTabBar actor={MEMBER} />);

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
    const { container } = render(<MobileTabBar actor={MEMBER} />);

    expect(container.querySelector('[data-slot="mobile-tab-bar"]')).not.toBeNull();
  });

  // The bar is an ink-navy band framing the page in both themes: it scopes the dark tokens to itself.
  it("luôn mang theme tối, kể cả khi trang đang ở theme sáng", () => {
    const { container } = render(<MobileTabBar actor={MEMBER} />);

    expect(
      container.querySelector('[data-slot="mobile-tab-bar"]')?.classList.contains("dark")
    ).toBe(true);
  });
});

describe("MobileTabBar - Manager", () => {
  it("chưa có Grant nào thì thấy y hệt Member", () => {
    render(<MobileTabBar actor={{ role: GuildRole.MANAGER }} />);

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử"]);
  });

  it("có Capability của một tab Thiết lập thì thấy Thiết lập", () => {
    render(
      <MobileTabBar
        actor={{ role: GuildRole.MANAGER, capabilities: [Capability.ATTENDANCE] }}
      />
    );

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử", "Thiết lập"]);
  });

  it("Xếp team là mục chỉ dành cho màn rộng nên không hiện trên điện thoại", () => {
    render(
      <MobileTabBar
        actor={{ role: GuildRole.MANAGER, capabilities: [Capability.TEAM_BUILDER] }}
      />
    );

    expect(tabLabels()).toEqual(["Điểm danh", "Lịch sử"]);
  });
});

describe("MobileTabBar - chuyển trang", () => {
  it("mọi tab mang kiểu page-nav", () => {
    render(<MobileTabBar actor={ADMIN} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("data-transition-types")).toBe("page-nav");
    }
  });
});
