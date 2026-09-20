import { describe, expect, it } from "vitest";

import { ApiError } from "../api-client";
import { isSessionExpired } from "../session-expired";

describe("isSessionExpired", () => {
  it("nhận ra 401 từ API", () => {
    expect(isSessionExpired(new ApiError("Bạn cần đăng nhập.", 401))).toBe(true);
  });

  it("không nhận nhầm lỗi khác", () => {
    // A missed attendance deadline is a 409 and a lost permission is a 403: pressing again fails
    // identically for both, and refreshing the session helps with neither.
    expect(isSessionExpired(new ApiError("Đã quá hạn.", 409))).toBe(false);
    expect(isSessionExpired(new ApiError("Không có quyền.", 403))).toBe(false);
    expect(isSessionExpired(new Error("mạng hỏng"))).toBe(false);
    expect(isSessionExpired("401")).toBe(false);
  });
});
