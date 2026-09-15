// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuildRole } from "@guild/shared/enums";

import { ROUTES } from "@/config/routes";

vi.mock("server-only", () => ({}));

// Signed in the header renders the nav and the user menu, both of which read the router. Nothing in
// these tests navigates.
vi.mock("next/navigation", () => ({
  usePathname: () => ROUTES.attendance,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const getSession = vi.fn();
const fetchMe = vi.fn();

vi.mock("@/features/auth/server", () => ({
  getSession: () => getSession(),
  fetchMe: () => fetchMe(),
}));

import { SiteHeader } from "../site-header";

afterEach(cleanup);

/**
 * `SiteHeader` is an async Server Component; awaiting it gives the element tree to render, which is
 * all these tests need - nothing here is interactive.
 */
async function renderHeader() {
  render(await SiteHeader());
}

describe("SiteHeader - khách chưa đăng nhập", () => {
  it("bấm được tên bang để về trang giới thiệu", async () => {
    getSession.mockResolvedValue(null);

    await renderHeader();

    expect(
      screen
        .getByRole("link", { name: /Mèo Mập Giang Hồ/ })
        .getAttribute("href")
    ).toBe(ROUTES.landing);
  });

  it("thấy nút đăng nhập", async () => {
    getSession.mockResolvedValue(null);

    await renderHeader();

    expect(
      screen.getByRole("button", { name: "Đăng nhập" }).getAttribute("href")
    ).toBe(ROUTES.login);
  });
});

describe("SiteHeader - đã đăng nhập", () => {
  it("tên bang dẫn về màn điểm danh và không còn nút đăng nhập", async () => {
    getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MEMBER,
    });
    fetchMe.mockResolvedValue(null);

    await renderHeader();

    expect(
      screen
        .getByRole("link", { name: /Mèo Mập Giang Hồ/ })
        .getAttribute("href")
    ).toBe(ROUTES.attendance);
    expect(screen.queryByRole("button", { name: "Đăng nhập" })).toBeNull();
  });
});
