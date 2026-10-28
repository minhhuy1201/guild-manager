import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { ErrorNotice } from "@/components/shared/error-notice";
import { ROUTES } from "@/config/routes";
import { AttendanceScreen } from "@/features/attendance";
import { loginErrorMessage } from "@/features/auth";
import { WEB_AUTH_ERROR } from "@/features/auth/core";

vi.mock("server-only", () => ({}));

const getActor = vi.fn();

vi.mock("@/features/auth/server", () => ({
  getActor: () => getActor(),
}));

/** Stand-in for `next/navigation`'s `redirect`, which throws to unwind the render. */
class Redirected extends Error {
  constructor(readonly target: string) {
    super(`redirect: ${target}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (target: string) => {
    throw new Redirected(target);
  },
}));

vi.mock("@/features/attendance", () => ({ AttendanceScreen: () => null }));
vi.mock("@/components/shared/error-notice", () => ({ ErrorNotice: () => null }));

const AttendancePage = (await import("../diem-danh/page")).default;

const ACTOR = { discordId: "1", role: "MEMBER", capabilities: [] };

/**
 * Render the page and list the elements it composed.
 * @param error - The `?error=` the page was opened with
 * @returns The fragment's element children
 */
async function renderPage(error?: string): Promise<ReactElement[]> {
  const page = await AttendancePage({ searchParams: Promise.resolve({ error }) });
  const children = (page.props as { children: unknown[] }).children;

  return children.filter(isValidElement);
}

describe("Trang điểm danh", () => {
  it("không có phiên thì đẩy về đăng nhập", async () => {
    getActor.mockResolvedValue(null);

    await expect(renderPage()).rejects.toEqual(new Redirected(ROUTES.login));
  });

  it("có phiên thì hiện màn điểm danh cho đúng người xem", async () => {
    getActor.mockResolvedValue(ACTOR);

    const [screen, ...rest] = await renderPage();

    expect(rest).toHaveLength(0);
    expect(screen.type).toBe(AttendanceScreen);
    expect(screen.props).toEqual({ actor: ACTOR });
  });

  it("bị trang khác đẩy về kèm lỗi thì báo lỗi phía trên màn điểm danh", async () => {
    getActor.mockResolvedValue(ACTOR);

    const [notice, screen] = await renderPage(WEB_AUTH_ERROR.notGranted);

    expect(notice.type).toBe(ErrorNotice);
    expect(notice.props).toEqual({
      message: loginErrorMessage(WEB_AUTH_ERROR.notGranted),
    });
    expect(screen.type).toBe(AttendanceScreen);
  });
});
