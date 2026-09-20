import { describe, expect, it } from "vitest";

import { countDayTotals } from "../day-totals";
import { recordKey } from "../record-key";

const SESSIONS = [{ id: "a" }, { id: "b" }];

describe("countDayTotals", () => {
  it("đếm Có, Không và Chưa điểm danh cho từng ngày", () => {
    const records = {
      [recordKey("c1", "a")]: { isPresent: true },
      [recordKey("c2", "a")]: { isPresent: false },
      [recordKey("c1", "b")]: { isPresent: true },
    };

    const totals = countDayTotals(["c1", "c2", "c3"], SESSIONS, records);

    expect(totals.a).toEqual({ co: 1, khong: 1, chuaTraLoi: 1 });
    expect(totals.b).toEqual({ co: 1, khong: 0, chuaTraLoi: 2 });
  });

  // Records from people who have left the guild must not count towards the current guild's
  // numbers.
  it("chỉ đếm những người được đưa vào", () => {
    const records = { [recordKey("ghost", "a")]: { isPresent: true } };

    expect(countDayTotals(["c1"], SESSIONS, records).a).toEqual({
      co: 0,
      khong: 0,
      chuaTraLoi: 1,
    });
  });
});
