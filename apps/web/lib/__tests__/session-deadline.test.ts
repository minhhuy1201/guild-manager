import { describe, expect, it } from "vitest";

import { defaultDeadline } from "@shared/lib/battle-session";

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-21T20:30' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe("defaultDeadline", () => {
  it("trận Thứ 2/3/4 có hạn 10:00 sáng chính ngày đánh", () => {
    expect(defaultDeadline(vn("2026-07-21T20:30")).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
    expect(defaultDeadline(vn("2026-07-20T19:00")).toISOString()).toBe(
      vn("2026-07-20T10:00").toISOString()
    );
    expect(defaultDeadline(vn("2026-07-22T21:00")).toISOString()).toBe(
      vn("2026-07-22T10:00").toISOString()
    );
  });

  it("trận Thứ 5 trở đi có hạn 17:00 Thứ 5 cùng tuần", () => {
    expect(defaultDeadline(vn("2026-07-23T20:30")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
    expect(defaultDeadline(vn("2026-07-25T20:00")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
  });

  it("trận Chủ nhật vẫn quy về Thứ 5 của tuần bắt đầu từ Thứ 2 trước đó", () => {
    expect(defaultDeadline(vn("2026-07-26T20:00")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
  });
});
