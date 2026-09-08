import { NextRequest } from "next/server";
import { GuildClass, GuildRole } from "@guild/shared/enums";
import type { AuthTokens } from "@guild/shared/schemas";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  WEB_AUTH_ERROR,
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

/** The token pair the API returns on a successful refresh. */
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
 * Build a NextRequest carrying session cookies.
 * @param path - Path of the request
 * @param cookies - Access/refresh tokens to attach
 * @returns A request ready to hand to `proxy()`
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
 * Sign a valid/expired token with SECRET.
 * @param secondsToExpiry - Seconds until expiry; negative means already expired
 * @param payload - Base payload, an admin by default
 * @returns The three-part token
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
    // Written into the request so this very render reads the new token.
    expect(req.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe(
      RENEWED.accessToken
    );
    expect(req.cookies.get(REFRESH_TOKEN_COOKIE)?.value).toBe(
      RENEWED.refreshToken
    );
    // Written into the response so the browser keeps it for later requests.
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

  describe("khi chữ ký không phải của mình", () => {
    it("nói ra thay vì im lặng như một phiên hết hạn", async () => {
      // AUTH_SECRET lệch giữa hai app: cả access lẫn refresh đều verify bằng secret của web, nên cả
      // hai hỏng cùng lúc và người dùng bị đá về đăng nhập ngay sau khi vừa đăng nhập xong.
      const foreign = await signToken({ secret: "secret-cua-app-khac" });

      const response = await proxy(
        request(ROUTES.attendance, { access: foreign, refresh: foreign })
      );

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe(ROUTES.login);
      expect(location.searchParams.get("error")).toBe(
        WEB_AUTH_ERROR.sessionInvalid
      );
      expect(refreshRequest).not.toHaveBeenCalled();
    });

    it("phiên hết hạn bình thường thì không mang mã lỗi nào", async () => {
      const response = await proxy(
        request(ROUTES.attendance, {
          access: await token(-10),
          refresh: await token(-10),
        })
      );

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.searchParams.get("error")).toBeNull();
    });

    it("một chữ ký hợp lệ là đủ để không đổ cho cấu hình", async () => {
      // Access cookie hỏng nhưng refresh vẫn ký đúng secret của mình, và API từ chối refresh (sập,
      // hoặc chủ thẻ vừa bị gỡ khỏi bang). Secret rõ ràng không sai - đừng bảo người ta đi báo admin.
      refreshRequest.mockRejectedValue(new Error("API sập"));

      const response = await proxy(
        request(ROUTES.attendance, {
          access: "khong-phai-jwt",
          refresh: await token(3600),
        })
      );

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.searchParams.get("error")).toBeNull();
    });

    it("cookie rỗng không phải là token ai đó đã ký", async () => {
      // Ô cookie có mặt nhưng trống rỗng: không có chữ ký nào sai cả, nên đừng đổ cho cấu hình.
      const req = request(ROUTES.attendance);
      req.cookies.set(ACCESS_TOKEN_COOKIE, "");
      req.cookies.set(REFRESH_TOKEN_COOKIE, "");

      const response = await proxy(req);

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.searchParams.get("error")).toBeNull();
    });
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

    it("cũng là lỗi cấu hình, nên cũng nói ra", async () => {
      const response = await proxy(
        request(ROUTES.attendance, { access: await token(3600) })
      );

      const location = new URL(response.headers.get("location") ?? "");
      expect(location.searchParams.get("error")).toBe(
        WEB_AUTH_ERROR.sessionInvalid
      );
    });
  });
});
