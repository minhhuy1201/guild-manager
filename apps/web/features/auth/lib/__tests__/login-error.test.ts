import { describe, expect, it } from "vitest";

import { loginErrorMessage } from "../login-error";

describe("loginErrorMessage", () => {
  it("dịch mã lỗi backend sang câu tiếng Việt", () => {
    expect(loginErrorMessage("khong-thuoc-bang")).toBe(
      "Tài khoản Discord này chưa được gán cho thành viên nào trong bang. Liên hệ quản trị viên."
    );
    expect(loginErrorMessage("tu-choi")).toBe(
      "Bạn đã huỷ đăng nhập bằng Discord."
    );
  });

  it("không có mã thì không hiện gì; mã lạ thì hiện câu chung", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("gi-do-la")).toBe(
      "Không đăng nhập được, vui lòng thử lại."
    );
  });
});
