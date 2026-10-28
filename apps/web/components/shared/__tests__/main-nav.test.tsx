// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuildRole } from "@guild/shared/enums";
import type { Actor } from "@guild/shared/lib";

import { ROUTES } from "@/config/routes";

const MEMBER: Actor = { role: GuildRole.MEMBER };
const ADMIN: Actor = { role: GuildRole.ADMIN };

const nav = vi.hoisted(() => ({ pathname: "/diem-danh" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));

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

import { MainNav } from "../main-nav";

afterEach(cleanup);
beforeEach(() => {
  // jsdom has no ResizeObserver; the nav only needs it to re-measure on a layout change.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
  nav.pathname = ROUTES.attendance;
});

// From sm to lg (landscape phones, tablets) four full labels squeeze the guild name out of the
// header, so the nav uses short labels there. A screen reader still reads the full name.
describe("MainNav - nhãn ngắn dưới lg", () => {
  it("mục có nhãn ngắn: tên truy cập là nhãn đầy đủ, dưới lg hiện chữ ngắn", () => {
    render(<MainNav actor={MEMBER} />);

    const link = screen.getByRole("link", { name: "Lịch sử điểm danh" });

    expect(within(link).getByText("Lịch sử").className).toContain("lg:hidden");
    expect(within(link).getByText("Lịch sử điểm danh").className).toContain(
      "max-lg:hidden"
    );
  });

  it("mục có nhãn ngắn trùng nhãn đầy đủ thì chỉ hiện chữ một lần", () => {
    render(<MainNav actor={MEMBER} />);

    const link = screen.getByRole("link", { name: "Điểm danh" });

    expect(within(link).getAllByText("Điểm danh")).toHaveLength(1);
  });
});

describe("MainNav - mục active và indicator", () => {
  it("chỉ mục khớp route hiện tại mang aria-current", () => {
    nav.pathname = ROUTES.attendanceHistory;
    render(<MainNav actor={MEMBER} />);

    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");

    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("href")).toBe(ROUTES.attendanceHistory);
  });

  it("một indicator chung trỏ tới mục active", () => {
    nav.pathname = ROUTES.attendanceHistory;
    const { container } = render(<MainNav actor={MEMBER} />);

    const indicators = container.querySelectorAll('[data-slot="nav-indicator"]');

    expect(indicators).toHaveLength(1);
    expect(indicators[0].getAttribute("data-active-href")).toBe(
      ROUTES.attendanceHistory
    );
  });

  it("route không thuộc nav thì không có mục active và indicator ẩn", () => {
    nav.pathname = "/khong-ton-tai";
    const { container } = render(<MainNav actor={MEMBER} />);

    expect(
      screen.queryAllByRole("link").some((l) => l.hasAttribute("aria-current"))
    ).toBe(false);
    expect(
      container
        .querySelector('[data-slot="nav-indicator"]')
        ?.hasAttribute("data-active-href")
    ).toBe(false);
  });
});

describe("MainNav - chuyển trang", () => {
  it("mọi mục đều là điều hướng thật nên mang kiểu page-nav", () => {
    render(<MainNav actor={ADMIN} />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("data-transition-types")).toBe("page-nav");
    }
  });
});

describe("MainNav - đo indicator", () => {
  // Below sm the nav is `display: none`, so every offsetWidth is 0; measuring that would park the
  // bar at x=0 and make it slide in from the left once the nav appears.
  it("link rộng 0 (nav đang ẩn) coi như chưa đo", () => {
    const { container } = render(<MainNav actor={MEMBER} />);

    expect(container.querySelector("nav")?.hasAttribute("data-measured")).toBe(
      false
    );
  });

  it("link có bề rộng thì đã đo", () => {
    const width = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockReturnValue(120);
    const { container } = render(<MainNav actor={MEMBER} />);

    expect(container.querySelector("nav")?.hasAttribute("data-measured")).toBe(
      true
    );
    width.mockRestore();
  });
});
