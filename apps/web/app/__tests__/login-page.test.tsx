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

  // The bot's "Mở website" button sends every member through this page on their way to attendance,
  // so someone already logged in has to be let through rather than shown a login form.
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

  // `redirect` is a URL parameter, and anyone in Discord can repost that button.
  it("không đá người ta ra khỏi tên miền của mình", async () => {
    getSession.mockResolvedValue({ discordId: "1", role: "MEMBER" });

    expect(await targetOf({ redirect: "//evil.example" })).toBe(
      ROUTES.attendance
    );
    expect(await targetOf({ redirect: "https://evil.example" })).toBe(
      ROUTES.attendance
    );
    // A browser reads a backslash exactly as two slashes, so this leaves the domain too.
    expect(await targetOf({ redirect: "/\\evil.example" })).toBe(
      ROUTES.attendance
    );
  });
});
