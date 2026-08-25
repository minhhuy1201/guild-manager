import { describe, expect, it } from "vitest";

import {
  atVnTime,
  deadlineCapFor,
  guildWarDeadline,
  isWithinDeadlineCap,
  vnParts,
  vnWeekday,
} from "@guild/shared/lib";

/**
 * Build a Date from Vietnam time (UTC+7) for readability in tests.
 * @param iso - A string like '2026-07-21T20:30', read as Vietnam time
 * @returns The matching UTC Date
 */
function vn(iso: string): Date {
  return new Date(`${iso}:00+07:00`);
}

describe("deadlineCapFor", () => {
  it("trận sau 10:00 có trần 10:00 sáng chính ngày đánh", () => {
    expect(deadlineCapFor(vn("2026-07-21T20:30")).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
    // Thursday now follows the battle-day rule too, no longer 17:00 Thursday.
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
    // 00:30 Vietnam time is before 10:00, so the cap falls back to the battle time itself.
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

describe("vnWeekday", () => {
  it("đếm theo chuẩn ISO: Thứ 2 = 1, Chủ nhật = 7", () => {
    expect(vnWeekday(vn("2026-07-20T00:00"))).toBe(1);
    expect(vnWeekday(vn("2026-07-26T23:59"))).toBe(7);
  });

  it("lấy thứ của ngày VN, không phải ngày UTC", () => {
    // 17:30 UTC Monday = 00:30 Tuesday Vietnam time.
    expect(vnWeekday(new Date("2026-07-20T17:30:00Z"))).toBe(2);
  });
});

describe("atVnTime", () => {
  it("đặt giờ/phút trong chính ngày VN của mốc gốc", () => {
    expect(atVnTime(vn("2026-07-21T20:30"), 10, 0).toISOString()).toBe(
      vn("2026-07-21T10:00").toISOString()
    );
  });

  it("mốc sát nửa đêm giờ VN vẫn thuộc ngày VN của nó", () => {
    // 23:59 VN on the 21st is 16:59 UTC the same day; it must not slide into the 22nd.
    expect(atVnTime(vn("2026-07-21T23:59"), 0, 0).toISOString()).toBe(
      vn("2026-07-21T00:00").toISOString()
    );
  });
});

describe("vnParts", () => {
  it("trả tháng 1-12, không phải 0-11 như getUTCMonth()", () => {
    expect(vnParts(vn("2026-01-05T08:07"))).toEqual({
      year: 2026,
      month: 1,
      day: 5,
      hour: 8,
      minute: 7,
    });
  });

  it("đọc theo ngày VN chứ không theo ngày UTC", () => {
    // 17:30 UTC on the 20th = 00:30 on the 21st Vietnam time.
    expect(vnParts(new Date("2026-07-20T17:30:00Z"))).toEqual({
      year: 2026,
      month: 7,
      day: 21,
      hour: 0,
      minute: 30,
    });
  });
});
