// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Capability, GuildRole } from "@guild/shared/enums";

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

// The real `getActor` and `getMe` run over these two reads, as they do in the app.
vi.mock("@/features/auth/api/session", () => ({
  getSession: () => getSession(),
}));
vi.mock("@/features/auth/api/me", () => ({ fetchMe: () => fetchMe() }));

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

import { SiteHeader } from "../site-header";

afterEach(cleanup);
// jsdom has no ResizeObserver, which the nav uses to re-measure its sliding bar.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  }
);

/** `/auth/me` for a Member: the header reads it for every signed-in user. */
const MEMBER_ME = {
  ok: true,
  data: {
    role: GuildRole.MEMBER,
    capabilities: [],
    grantedCommands: [],
    character: null,
  },
};

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

describe("SiteHeader - theme", () => {
  // The header is an ink-navy band framing the page in both themes: it scopes the dark tokens to
  // itself rather than following the page.
  it("header luôn mang theme tối, kể cả khi trang đang ở theme sáng", async () => {
    getSession.mockResolvedValue(null);

    await renderHeader();

    expect(screen.getByRole("banner").classList.contains("dark")).toBe(true);
  });

  it("khách chưa đăng nhập có công tắc chế độ tối", async () => {
    getSession.mockResolvedValue(null);

    await renderHeader();

    expect(screen.getByRole("switch", { name: "Chế độ tối" })).toBeTruthy();
  });

  it("đã đăng nhập vẫn có công tắc ngay cạnh tên bang, không nằm trong menu tài khoản", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.MEMBER });
    fetchMe.mockResolvedValue(MEMBER_ME);

    await renderHeader();

    const brand = screen.getByRole("link", { name: /Mèo Mập Giang Hồ/ });
    const toggle = screen.getByRole("switch", { name: "Chế độ tối" });
    expect(brand.nextElementSibling).toBe(toggle);
  });
});

describe("SiteHeader - đã đăng nhập", () => {
  it("tên bang dẫn về màn điểm danh và không còn nút đăng nhập", async () => {
    getSession.mockResolvedValue({
      discordId: "1",
      role: GuildRole.MEMBER,
    });
    fetchMe.mockResolvedValue(MEMBER_ME);

    await renderHeader();

    expect(
      screen
        .getByRole("link", { name: /Mèo Mập Giang Hồ/ })
        .getAttribute("href")
    ).toBe(ROUTES.attendance);
    expect(screen.queryByRole("button", { name: "Đăng nhập" })).toBeNull();
  });
});

describe("SiteHeader - phiên đã đăng nhập", () => {
  it.each([
    ["đọc được tài khoản", MEMBER_ME],
    ["backend từ chối tài khoản", { ok: false, message: "Hết phiên", statusCode: 401 }],
  ])("vẫn vẽ nav khi %s", async (_name, meResult) => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.MEMBER });
    fetchMe.mockResolvedValue(meResult);

    await renderHeader();

    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Đăng nhập" })).toBeNull();
  });
});

describe("SiteHeader - chuyển trang", () => {
  it("tên bang mang kiểu page-nav", async () => {
    getSession.mockResolvedValue(null);

    await renderHeader();

    expect(
      screen
        .getByRole("link", { name: /Mèo Mập Giang Hồ/ })
        .getAttribute("data-transition-types")
    ).toBe("page-nav");
  });

  it("header và tab bar có tên view-transition riêng để không bị main phủ lên", async () => {
    getSession.mockResolvedValue({ role: GuildRole.ADMIN, discordId: "1" });
    fetchMe.mockResolvedValue({ ok: false, message: "x", statusCode: 500 });

    const { container } = render(await SiteHeader());

    expect(
      container.querySelector("header")?.style.viewTransitionName
    ).toBe("site-header");
    expect(
      container.querySelector<HTMLElement>('[data-slot="mobile-tab-bar"]')
        ?.style.viewTransitionName
    ).toBe("mobile-tab-bar");
  });
});

describe("SiteHeader - nav theo Capability", () => {
  /**
   * Sign in as a Manager holding the given Capabilities.
   * @param capabilities - Grants the `/auth/me` read returns
   */
  function signInAsManager(...capabilities: Capability[]) {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.MANAGER });
    fetchMe.mockResolvedValue({
      ok: true,
      data: {
        role: GuildRole.MANAGER,
        capabilities,
        grantedCommands: [],
        character: null,
      },
    });
  }

  /**
   * The names of the nav links in the header (the phone tab bar repeats the same entries).
   * @returns Link names inside the header nav
   */
  function navLinkNames(): string[] {
    const nav = screen.getAllByRole("navigation", { name: "Điều hướng chính" })[0];

    return Array.from(nav.querySelectorAll("a")).map(
      (link) => link.getAttribute("aria-label") ?? link.textContent ?? ""
    );
  }

  it("Manager chưa có Grant nào thấy nav y hệt Member", async () => {
    signInAsManager();

    await renderHeader();

    expect(navLinkNames()).toEqual(["Điểm danh", "Lịch sử điểm danh", "Chiến thuật"]);
  });

  it("Manager có Xếp team thấy mục Xếp team nhưng không có Thiết lập", async () => {
    signInAsManager(Capability.TEAM_BUILDER);

    await renderHeader();

    expect(navLinkNames()).toContain("Xếp team");
    expect(navLinkNames()).not.toContain("Thiết lập");
  });

  it.each([Capability.SCHEDULE, Capability.MEMBERS, Capability.ATTENDANCE])(
    "Manager có %s thì thấy Thiết lập",
    async (capability) => {
      signInAsManager(capability);

      await renderHeader();

      expect(navLinkNames()).toContain("Thiết lập");
    }
  );

  it("Capability không thuộc Thiết lập không mở Thiết lập", async () => {
    signInAsManager(Capability.CAT_RACE, Capability.TACTICS);

    await renderHeader();

    expect(navLinkNames()).not.toContain("Thiết lập");
  });

  it("khi /auth/me lỗi, Manager không có mục nào thêm", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.MANAGER });
    fetchMe.mockResolvedValue({ ok: false, message: "x", statusCode: 500 });

    await renderHeader();

    expect(navLinkNames()).toEqual(["Điểm danh", "Lịch sử điểm danh", "Chiến thuật"]);
  });

  it("token Admin cũ mà /auth/me báo giờ là Member thì không thấy mục quản trị nào", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.ADMIN });
    fetchMe.mockResolvedValue({
      ok: true,
      data: {
        role: GuildRole.MEMBER,
        capabilities: [],
        grantedCommands: [],
        character: null,
      },
    });

    await renderHeader();

    expect(navLinkNames()).toEqual(["Điểm danh", "Lịch sử điểm danh", "Chiến thuật"]);
  });

  it("token Admin mà /auth/me lỗi thì nav chỉ còn như Member", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.ADMIN });
    fetchMe.mockResolvedValue({ ok: false, message: "x", statusCode: 500 });

    await renderHeader();

    expect(navLinkNames()).toEqual(["Điểm danh", "Lịch sử điểm danh", "Chiến thuật"]);
  });

  it("token Member cũ mà /auth/me báo giờ là Quản lý có Xếp team thì thấy mục này ngay", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: GuildRole.MEMBER });
    fetchMe.mockResolvedValue({
      ok: true,
      data: {
        role: GuildRole.MANAGER,
        capabilities: [Capability.TEAM_BUILDER],
        grantedCommands: [],
        character: null,
      },
    });

    await renderHeader();

    expect(navLinkNames()).toContain("Xếp team");
  });
});
