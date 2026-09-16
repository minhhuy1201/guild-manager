import { describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

vi.mock("server-only", () => ({}));

const getSession = vi.fn();

vi.mock("@/features/auth/server", () => ({
  getSession: () => getSession(),
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

import LoginPage from "../dang-nhap/page";

/**
 * Render the page and report where it sent the visitor, or null when it rendered the form.
 * @param search - The page's query string
 * @returns The redirect target, or null
 */
async function targetOf(search: {
  error?: string;
  redirect?: string;
}): Promise<string | null> {
  try {
    await LoginPage({ searchParams: Promise.resolve(search) });

    return null;
  } catch (error) {
    if (error instanceof Redirected) return error.target;
    throw error;
  }
}

describe("Trang đăng nhập", () => {
  it("chưa đăng nhập thì hiện form, không đá đi đâu", async () => {
    getSession.mockResolvedValue(null);

    expect(await targetOf({})).toBeNull();
  });

  // Nút "Mở website" của bot đưa mọi thành viên qua trang này trên đường tới điểm danh, nên người
  // đã đăng nhập phải được đi tiếp chứ không phải nhìn một form đăng nhập.
  it("đã đăng nhập thì đi tiếp tới nơi người ta định tới", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    expect(await targetOf({ redirect: ROUTES.attendanceHistory })).toBe(
      ROUTES.attendanceHistory
    );
  });

  it("đã đăng nhập mà không nói đi đâu thì về màn điểm danh", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    expect(await targetOf({})).toBe(ROUTES.attendance);
  });

  // `redirect` là tham số trên URL, và cái nút kia thì ai trong Discord cũng dán lại được.
  it("không đá người ta ra khỏi tên miền của mình", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    expect(await targetOf({ redirect: "//evil.example" })).toBe(
      ROUTES.attendance
    );
    expect(await targetOf({ redirect: "https://evil.example" })).toBe(
      ROUTES.attendance
    );
  });
});
