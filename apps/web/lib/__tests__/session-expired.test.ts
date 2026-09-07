import { describe, expect, it } from "vitest";

import { ApiError } from "../api-client";
import { isSessionExpired } from "../session-expired";

describe("isSessionExpired", () => {
  it("nhận ra 401 từ API", () => {
    expect(isSessionExpired(new ApiError("Bạn cần đăng nhập.", 401))).toBe(true);
  });

  it("không nhận nhầm lỗi khác", () => {
    // Quá hạn điểm danh là 409, hết quyền là 403: cả hai bấm lại vẫn hỏng y hệt, làm mới phiên
    // không giúp được gì.
    expect(isSessionExpired(new ApiError("Đã quá hạn.", 409))).toBe(false);
    expect(isSessionExpired(new ApiError("Không có quyền.", 403))).toBe(false);
    expect(isSessionExpired(new Error("mạng hỏng"))).toBe(false);
    expect(isSessionExpired("401")).toBe(false);
  });
});
