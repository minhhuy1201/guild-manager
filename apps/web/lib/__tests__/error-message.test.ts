import { describe, expect, it } from "vitest";

import { ApiError } from "../api-client";
import { errorMessageOf } from "../error-message";

const FALLBACK = "Không lưu được thay đổi.";

describe("errorMessageOf", () => {
  it("đọc nguyên văn message của ApiError", () => {
    const caught = new ApiError("Tên thành viên đã tồn tại.", 409);

    expect(errorMessageOf(caught, FALLBACK)).toBe("Tên thành viên đã tồn tại.");
  });

  it("đọc message của Error thường — validate phía client ném ra cái này", () => {
    const caught = new Error("Ngày giờ chưa hợp lệ.");

    expect(errorMessageOf(caught, FALLBACK)).toBe("Ngày giờ chưa hợp lệ.");
  });

  it("message rỗng thì dùng câu fallback", () => {
    expect(errorMessageOf(new Error(""), FALLBACK)).toBe(FALLBACK);
  });

  it("message chỉ có khoảng trắng cũng coi như rỗng", () => {
    expect(errorMessageOf(new Error("   "), FALLBACK)).toBe(FALLBACK);
  });

  it("thứ ném ra không phải Error thì dùng câu fallback", () => {
    expect(errorMessageOf("mất mạng", FALLBACK)).toBe(FALLBACK);
    expect(errorMessageOf(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
