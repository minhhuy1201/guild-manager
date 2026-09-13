import { describe, expect, it } from "vitest";

import { timeLeft } from "../time-left";

const NOW = new Date("2026-09-13T10:00:00.000Z");

/**
 * A deadline some time after `NOW`.
 * @param minutes - How far ahead, in minutes (negative for the past)
 * @returns The deadline as the API sends it
 */
function inMinutes(minutes: number): string {
  return new Date(NOW.getTime() + minutes * 60_000).toISOString();
}

describe("timeLeft", () => {
  it("còn hơn một ngày thì đếm theo ngày", () => {
    expect(timeLeft(inMinutes((2 * 24 + 3) * 60), NOW)).toEqual({
      label: "còn 2 ngày",
      isUrgent: false,
    });
  });

  it("đúng 24 giờ vẫn chưa gấp", () => {
    expect(timeLeft(inMinutes(24 * 60), NOW)).toEqual({
      label: "còn 1 ngày",
      isUrgent: false,
    });
  });

  it("dưới một ngày thì đếm theo giờ và là gấp", () => {
    expect(timeLeft(inMinutes(5 * 60 + 30), NOW)).toEqual({
      label: "còn 5 giờ",
      isUrgent: true,
    });
  });

  it("dưới một giờ thì đếm theo phút", () => {
    expect(timeLeft(inMinutes(45), NOW).label).toBe("còn 45 phút");
  });

  it("dưới một phút thì nói sắp khoá", () => {
    expect(timeLeft(new Date(NOW.getTime() + 20_000).toISOString(), NOW).label).toBe(
      "sắp khoá"
    );
  });

  // Đồng hồ máy người dùng có thể nhanh hơn server: API chưa khoá thì chưa được nói là đã khoá.
  it("đồng hồ máy đã qua hạn mà API chưa khoá thì vẫn chỉ nói sắp khoá", () => {
    expect(timeLeft(inMinutes(-3), NOW)).toEqual({
      label: "sắp khoá",
      isUrgent: true,
    });
  });
});
