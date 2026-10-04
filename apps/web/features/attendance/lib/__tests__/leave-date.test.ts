import { describe, expect, it } from "vitest";

import { fromDayKey, toDayKey } from "../leave-date";

describe("leave day keys", () => {
  it("toDayKey đọc ngày theo lịch của người chọn, không lệch múi giờ", () => {
    // A calendar click yields local midnight; going through UTC would shift it back a day east of GMT.
    expect(toDayKey(new Date(2026, 9, 5))).toBe("2026-10-05");
    expect(toDayKey(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("fromDayKey là nghịch đảo của toDayKey", () => {
    expect(toDayKey(fromDayKey("2026-10-05"))).toBe("2026-10-05");
  });
});
