import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";

vi.mock("server-only", () => ({}));

const createSession = vi.hoisted(() => vi.fn());
const exchangeRequest = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/server", () => ({ createSession }));
vi.mock("@/features/auth/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/core")>()),
  exchangeRequest,
}));

import { GET } from "../dang-nhap/discord/route";

/**
 * Run the callback with a valid exchange code.
 * @param redirect - The raw `redirect` query value, omitted when undefined
 * @returns The `Location` the visitor is sent to
 */
async function locationFor(redirect?: string): Promise<URL> {
  const query = new URLSearchParams({ exchange: "ma-doi" });
  if (redirect !== undefined) query.set("redirect", redirect);

  const response = await GET(
    new NextRequest(`https://guild.test${ROUTES.loginCallback}?${query}`)
  );

  return new URL(response.headers.get("location") ?? "");
}

describe("Callback đăng nhập Discord", () => {
  beforeEach(() => {
    exchangeRequest.mockReset().mockResolvedValue({ accessToken: "a" });
    createSession.mockReset();
  });

  it("đưa tới nơi người ta định tới", async () => {
    const location = await locationFor(ROUTES.attendanceHistory);

    expect(location.pathname).toBe(ROUTES.attendanceHistory);
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("không nói đi đâu thì về màn điểm danh", async () => {
    expect((await locationFor()).pathname).toBe(ROUTES.attendance);
  });

  // `redirect` is a URL parameter, and anyone in Discord can repost that button. A browser reads a
  // backslash exactly as a slash, so `/\host` leaves the domain just as `//host` does.
  it.each(["//evil.example", "/\\evil.example", "https://evil.example"])(
    "không đá người ta ra khỏi tên miền của mình (%s)",
    async (redirect) => {
      const location = await locationFor(redirect);

      expect(location.host).toBe("guild.test");
      expect(location.pathname).toBe(ROUTES.attendance);
    }
  );
});
