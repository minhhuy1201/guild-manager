import { describe, expect, it } from "vitest";

import {
  deadlineCapFor,
  guildWarDeadline,
  isWithinDeadlineCap,
} from "@shared/lib/battle-session";

/**
 * Tạo Date từ giờ Việt Nam (UTC+7) cho dễ đọc trong test.
 * @param iso - Chuỗi dạng '2026-07-21T20:30' hiểu theo giờ VN
 * @returns Date UTC tương ứng
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe("deadlineCapFor", () => {
  it("trận sau 10:00 có trần 10:00 sáng chính ngày đánh", () => {
    expect(deadlineCapFor(vn("2026-07-21T20:30")).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
    // Thứ 5 nay cũng theo luật ngày đánh, không còn 17:00 Thứ 5.
    expect(deadlineCapFor(vn("2026-07-23T20:30")).toISOString()).toBe(
      vn("2026-07-23T10:00").toISOString()
    );
  });

  it("trận trước 10:00 có trần là chính giờ đánh", () => {
    expect(deadlineCapFor(vn("2026-07-21T08:00")).toISOString()).toBe(
      vn("2026-07-21T08:00").toISOString()
    );
  });

  it("trận đúng 10:00 có trần đúng 10:00", () => {
    expect(deadlineCapFor(vn("2026-07-21T10:00")).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
  });

  it("trận sát nửa đêm giờ VN vẫn lấy 10:00 của chính ngày đó", () => {
    expect(deadlineCapFor(vn("2026-07-21T23:59")).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
    // 00:30 giờ VN là trước 10:00 nên trần rơi về chính giờ đánh.
    expect(deadlineCapFor(vn("2026-07-22T00:30")).toISOString()).toBe(
      vn("2026-07-22T00:30").toISOString()
    );
  });
});

describe("isWithinDeadlineCap", () => {
  const battle = vn("2026-07-21T20:30");

  it("hạn chót đúng bằng trần vẫn hợp lệ", () => {
    expect(isWithinDeadlineCap(vn("2026-07-21T10:00"), battle)).toBe(true);
  });

  it("hạn chót sớm hơn trần thì hợp lệ", () => {
    expect(isWithinDeadlineCap(vn("2026-07-20T22:00"), battle)).toBe(true);
  });

  it("hạn chót muộn hơn trần thì không hợp lệ", () => {
    expect(isWithinDeadlineCap(vn("2026-07-21T10:01"), battle)).toBe(false);
    expect(isWithinDeadlineCap(vn("2026-07-21T17:00"), battle)).toBe(false);
  });
});

describe("guildWarDeadline", () => {
  it("luôn là 17:00 Thứ 5 của tuần", () => {
    expect(guildWarDeadline(vn("2026-07-20T00:00")).toISOString()).toBe(
      vn("2026-07-23T17:00").toISOString()
    );
    expect(guildWarDeadline(vn("2026-07-27T00:00")).toISOString()).toBe(
      vn("2026-07-30T17:00").toISOString()
    );
  });

  it("tuần vắt qua mốc đổi tháng vẫn ra đúng ngày", () => {
    expect(guildWarDeadline(vn("2026-06-29T00:00")).toISOString()).toBe(
      vn("2026-07-02T17:00").toISOString()
    );
  });
});
