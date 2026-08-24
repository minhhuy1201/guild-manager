import { NextRequest } from "next/server";
import { GuildClass, GuildRole } from "@guild/shared/enums";
import type { AuthTokens } from "@guild/shared/schemas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/features/auth/core";
import {
  DEFAULT_PAYLOAD,
  MEMBER_PAYLOAD,
  expiresIn,
  signToken,
} from "@/features/auth/core/__tests__/sign-token";
import { ROUTES } from "@/config/routes";
import { proxy } from "@/proxy";

const SECRET = "secret-du-dai-cho-hmac-sha256-trong-test";

const refreshRequest = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/core")>()),
  refreshRequest,
}));

/** Cặp token API trả về khi gia hạn thành công. */
const RENEWED: AuthTokens = {
  accessToken: "access-moi",
  refreshToken: "refresh-moi",
  user: {
    discordId: "999888777666555444",
    discordUsername: "meobeo",
    discordAvatar: "a1b2c3d4e5f6",
    role: GuildRole.ADMIN,
    character: {
      id: "meo-beo-k7ma3x",
      name: "Mèo Béo",
      guildClass: GuildClass.THIET_Y,
    },
  },
};

/**
 * Dựng NextRequest kèm cookie phiên.
 * @param path - Đường dẫn của request
 * @param cookies - Access/refresh token muốn gắn vào request
 * @returns Request để đưa thẳng vào `proxy()`
 */
function request(
  path: string,
  cookies: { access?: string; refresh?: string } = {}
): NextRequest {
  const req = new NextRequest(new URL(path, "https://guild.test"));

  if (cookies.access) req.cookies.set(ACCESS_TOKEN_COOKIE, cookies.access);
  if (cookies.refresh) req.cookies.set(REFRESH_TOKEN_COOKIE, cookies.refresh);

  return req;
}

/**
 * Ký một token còn hạn/hết hạn bằng SECRET.
 * @param secondsToExpiry - Số giây tới hạn; âm nghĩa là token đã hết hạn
 * @param payload - Payload nền, mặc định là quản trị viên
 * @returns Token ba đoạn
 */
function token(
  secondsToExpiry: number,
  payload: Record<string, unknown> = DEFAULT_PAYLOAD
): Promise<string> {
  return signToken({
    payload: { ...payload, exp: expiresIn(secondsToExpiry) },
    secret: SECRET,
  });
}

describe("proxy", () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = SECRET;
    refreshRequest.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("cho qua và không gọi refresh khi access token còn hạn", async () => {
    const response = await proxy(
      request(ROUTES.teamBuilder, { access: await token(3600) })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it("gia hạn phiên và ghi cookie mới lên cả request lẫn response", async () => {
    const refresh = await token(3600);
    const req = request(ROUTES.teamBuilder, {
      access: await token(-10),
      refresh,
    });
    refreshRequest.mockResolvedValue(RENEWED);

    const response = await proxy(req);

    expect(refreshRequest).toHaveBeenCalledWith(refresh);
    // Ghi vào request để chính lần render này đọc được token mới.
    expect(req.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe(
      RENEWED.accessToken
    );
    expect(req.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe(
      RENEWED.refreshToken
    );
    // Ghi vào response để trình duyệt giữ cho các request sau.
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe(
      RENEWED.accessToken
    );
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe(
      RENEWED.refreshToken
    );
  });

  it("đá bang chúng khỏi route quản trị", async () => {
    const response = await proxy(
      request(ROUTES.teamBuilder, {
        access: await token(3600, MEMBER_PAYLOAD),
      })
    );

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      ROUTES.attendance
    );
  });

  it("cho bang chúng vào trang điểm danh", async () => {
    const response = await proxy(
      request(ROUTES.attendance, {
        access: await token(3600, MEMBER_PAYLOAD),
      })
    );

    expect(response.status).toBe(200);
  });

  it("đẩy về trang đăng nhập và xoá cookie hỏng khi cả hai token hết hạn", async () => {
    const response = await proxy(
      request(ROUTES.teamBuilder, {
        access: await token(-10),
        refresh: await token(-10),
      })
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe(ROUTES.login);
    expect(location.searchParams.get("redirect")).toBe(ROUTES.teamBuilder);
    expect(response.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("");
    expect(response.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe("");
    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it("đá cả trang điểm danh về đăng nhập khi phiên đã chết", async () => {
    const response = await proxy(
      request(ROUTES.attendance, { access: await token(-10) })
    );

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
      ROUTES.login
    );
  });

  it("vẫn cho khách vào trang đăng nhập", async () => {
    const response = await proxy(request(ROUTES.login));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  describe("khi thiếu AUTH_SECRET", () => {
    beforeEach(() => {
      delete process.env.AUTH_SECRET;
    });

    it("không ném, chỉ đá về trang đăng nhập", async () => {
      const response = await proxy(
        request(ROUTES.attendance, { access: await token(3600) })
      );

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location") ?? "").pathname).toBe(
        ROUTES.login
      );
    });

    it("chặn route quản trị", async () => {
      const response = await proxy(
        request(ROUTES.settings, { access: await token(3600) })
      );

      expect(response.status).toBe(307);
    });
  });
});
