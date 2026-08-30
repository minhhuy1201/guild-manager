// @vitest-environment jsdom
import { createElement } from "react";
import type { ComponentProps } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

const { logout, replace, refresh, contentProps } = vi.hoisted(() => ({
  logout: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  // Filled by the mocked DropdownMenuContent below; the positioning config is a prop, not a DOM
  // attribute, so this is the only place a test can read it.
  contentProps: { current: null as Record<string, unknown> | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));
vi.mock("../../api/login-action", () => ({ logout }));
vi.mock("@/components/ui/dropdown-menu", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/ui/dropdown-menu")>();

  return {
    ...actual,
    /**
     * The real content, with its props recorded on the way through.
     * @param props - Props the menu passes to the positioner
     * @returns The real dropdown content
     */
    DropdownMenuContent(
      props: ComponentProps<typeof actual.DropdownMenuContent>
    ) {
      contentProps.current = props as Record<string, unknown>;

      return createElement(actual.DropdownMenuContent, props);
    },
  };
});

import { UserMenu } from "../user-menu";

// React only batches and flushes state updates inside act() when it knows it is under test.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
// Base UI positions the popup through floating-ui, which watches the anchor with a ResizeObserver.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

/**
 * Render the menu and open it.
 * @param label - Display label of the signed-in user
 * @returns The trigger button
 */
async function openMenu(label: string | null = "Mèo Mập"): Promise<HTMLElement> {
  render(<UserMenu label={label} discordId="123456789012345678" avatarHash={null} />);
  const trigger = screen.getByRole("button");

  await act(async () => {
    fireEvent.click(trigger);
  });

  return trigger;
}

afterEach(cleanup);

describe("UserMenu", () => {
  beforeEach(() => {
    logout.mockClear().mockResolvedValue(undefined);
    replace.mockClear();
    refresh.mockClear();
    contentProps.current = null;
  });

  it("nút avatar tự xưng tên chủ tài khoản cho trình đọc màn hình", () => {
    render(
      <UserMenu label="Mèo Mập" discordId="123456789012345678" avatarHash={null} />
    );

    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
      "Menu tài khoản — Mèo Mập"
    );
  });

  it("chưa biết tên thì nhãn chỉ còn Menu tài khoản, và avatar hiện dấu hỏi", () => {
    render(
      <UserMenu label={null} discordId="123456789012345678" avatarHash={null} />
    );

    expect(screen.getByRole("button").getAttribute("aria-label")).toBe(
      "Menu tài khoản"
    );
    expect(screen.getByText("?")).toBeTruthy();
  });

  it("mở menu thì thấy tên ở trên và Đăng xuất ở dưới", async () => {
    await openMenu();

    expect(screen.getByText("Mèo Mập")).toBeTruthy();
    expect(screen.getByText("Đăng xuất")).toBeTruthy();
  });

  it("không có tên thì menu chỉ còn Đăng xuất, không có hàng nhãn rỗng", async () => {
    await openMenu(null);

    expect(screen.getByText("Đăng xuất")).toBeTruthy();
    expect(document.querySelector("[data-slot='dropdown-menu-label']")).toBeNull();
  });

  it("bấm Đăng xuất thì xoá phiên rồi mới chuyển về trang đăng nhập", async () => {
    await openMenu();

    await act(async () => {
      fireEvent.click(screen.getByText("Đăng xuất"));
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith(ROUTES.login);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
      refresh.mock.invocationCallOrder[0]
    );
  });

  it("menu neo vào cạnh trái avatar nhưng được phép lật khi màn hình hẹp", async () => {
    await openMenu();

    // The bug this guards: `align: "none"` let the menu overflow the right edge on a narrow
    // viewport and get clipped. `flip` moves it to the avatar's right edge instead. jsdom has no
    // layout, so the flip itself only shows in a real browser — the config is what a revert
    // would change.
    expect(contentProps.current?.align).toBe("start");
    expect(contentProps.current?.collisionAvoidance).toEqual({ align: "flip" });
  });
});
