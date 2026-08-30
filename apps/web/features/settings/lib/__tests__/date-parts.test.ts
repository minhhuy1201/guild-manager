import { describe, expect, it } from "vitest";

import {
  joinLocalValue,
  maskTime,
  parseDisplayDate,
  splitLocalValue,
  toDisplayDate,
} from "../date-parts";

describe("splitLocalValue", () => {
  it("tách chuỗi local thành ngày dd/MM/yyyy và giờ HH:mm", () => {
    expect(splitLocalValue("2026-07-21T20:30")).toEqual({
      date: "21/07/2026",
      time: "20:30",
    });
  });

  it("trả về hai ô rỗng khi chưa có giá trị", () => {
    expect(splitLocalValue("")).toEqual({ date: "", time: "" });
  });

  it("điền sẵn giờ mặc định khi chưa có giá trị", () => {
    expect(splitLocalValue("", "20:30")).toEqual({ date: "", time: "20:30" });
  });

  it("bỏ qua giờ mặc định khi đã có giá trị", () => {
    expect(splitLocalValue("2026-07-21T08:00", "20:30")).toEqual({
      date: "21/07/2026",
      time: "08:00",
    });
  });
});

describe("joinLocalValue", () => {
  it("ghép ngày và giờ thành chuỗi local", () => {
    expect(joinLocalValue("21/07/2026", "20:30")).toBe("2026-07-21T20:30");
  });

  it("đi vòng tròn không đổi giá trị", () => {
    const value = "2026-12-31T09:05";
    const { date, time } = splitLocalValue(value);

    expect(joinLocalValue(date, time)).toBe(value);
  });

  it("trả về rỗng khi thiếu một trong hai ô", () => {
    expect(joinLocalValue("21/07/2026", "")).toBe("");
    expect(joinLocalValue("", "20:30")).toBe("");
  });

  it("trả về rỗng khi ngày chưa gõ đủ", () => {
    expect(joinLocalValue("21/07", "20:30")).toBe("");
  });

  it("trả về rỗng khi ngày không có thật", () => {
    expect(joinLocalValue("31/02/2026", "20:30")).toBe("");
    expect(joinLocalValue("00/07/2026", "20:30")).toBe("");
    expect(joinLocalValue("21/13/2026", "20:30")).toBe("");
  });

  it("nhận ngày 29/02 của năm nhuận", () => {
    expect(joinLocalValue("29/02/2028", "20:30")).toBe("2028-02-29T20:30");
  });

  it("trả về rỗng khi giờ không hợp lệ", () => {
    expect(joinLocalValue("21/07/2026", "24:00")).toBe("");
    expect(joinLocalValue("21/07/2026", "20:60")).toBe("");
    expect(joinLocalValue("21/07/2026", "8:30")).toBe("");
  });
});

describe("toDisplayDate", () => {
  it("đổi Date thành chuỗi dd/MM/yyyy có số 0 đứng đầu", () => {
    expect(toDisplayDate(new Date(2026, 6, 5))).toBe("05/07/2026");
  });
});

describe("parseDisplayDate", () => {
  it("đổi chuỗi hiển thị thành Date lúc 0h", () => {
    expect(parseDisplayDate("21/07/2026")).toEqual(new Date(2026, 6, 21));
  });

  it("trả về undefined khi ngày chưa hợp lệ", () => {
    expect(parseDisplayDate("21/07")).toBeUndefined();
    expect(parseDisplayDate("31/02/2026")).toBeUndefined();
  });

  it("đi vòng tròn không đổi giá trị", () => {
    const display = "29/02/2028";

    expect(toDisplayDate(parseDisplayDate(display)!)).toBe(display);
  });
});

describe("maskTime", () => {
  it("tự chèn dấu : khi gõ số", () => {
    expect(maskTime("2")).toBe("2");
    expect(maskTime("20")).toBe("20");
    expect(maskTime("203")).toBe("20:3");
    expect(maskTime("2030")).toBe("20:30");
  });

  it("bỏ ký tự không phải số và phần thừa", () => {
    expect(maskTime("20:30:45")).toBe("20:30");
  });
});
