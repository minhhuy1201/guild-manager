import { describe, expect, it } from "vitest";

import { findActiveWeekStart, isWeekEditable } from "../week-status";

const PREVIOUS = "2026-07-26T17:00:00.000Z";
const ACTIVE = "2026-08-02T17:00:00.000Z";
const NEXT = "2026-08-09T17:00:00.000Z";

/** Mốc Thứ 7 23:59 tương ứng — `findActiveWeekStart` không đọc, chỉ để đủ shape. */
const PREVIOUS_END = "2026-08-01T16:59:00.000Z";
const ACTIVE_END = "2026-08-08T16:59:00.000Z";
const NEXT_END = "2026-08-15T16:59:00.000Z";

describe("findActiveWeekStart", () => {
  it("lấy tuần mang cờ isActive, không phải tuần đầu mảng", () => {
    const weeks = [
      { weekStart: NEXT, weekEnd: NEXT_END, isActive: false },
      { weekStart: ACTIVE, weekEnd: ACTIVE_END, isActive: true },
      { weekStart: PREVIOUS, weekEnd: PREVIOUS_END, isActive: false },
    ];

    expect(findActiveWeekStart(weeks)).toBe(ACTIVE);
  });

  it("không có tuần nào đang mở thì lấy tuần mới nhất", () => {
    const weeks = [
      { weekStart: PREVIOUS, weekEnd: PREVIOUS_END, isActive: false },
    ];

    expect(findActiveWeekStart(weeks)).toBe(PREVIOUS);
  });

  it("danh sách rỗng thì không có tuần nào", () => {
    expect(findActiveWeekStart([])).toBeNull();
  });
});

describe("isWeekEditable", () => {
  it("cho sửa tuần đang mở", () => {
    expect(isWeekEditable(ACTIVE, ACTIVE)).toBe(true);
  });

  it("cho sửa tuần kế tiếp", () => {
    expect(isWeekEditable(NEXT, ACTIVE)).toBe(true);
  });

  it("khoá tuần đã qua", () => {
    expect(isWeekEditable(PREVIOUS, ACTIVE)).toBe(false);
  });

  it("chưa biết tuần nào đang mở thì không cho sửa", () => {
    expect(isWeekEditable(ACTIVE, null)).toBe(false);
  });

  it("chưa chọn tuần nào thì không cho sửa", () => {
    expect(isWeekEditable(undefined, ACTIVE)).toBe(false);
  });
});
