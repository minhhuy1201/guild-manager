import { describe, expect, it } from "vitest";

import { historyWeekOptions, HISTORY_WEEK_COUNT } from "../history-weeks";

/** Monday 2026-09-07 00:00 Vietnam time, which is 2026-09-06 17:00 UTC. */
const CURRENT_WEEK = "2026-09-06T17:00:00.000Z";

describe("historyWeekOptions", () => {
  it("mở đầu bằng tuần đang mở", () => {
    const [first] = historyWeekOptions(CURRENT_WEEK);

    expect(first.weekStart).toBe(CURRENT_WEEK);
    expect(first.isCurrent).toBe(true);
  });

  it("lùi dần từng tuần một", () => {
    const options = historyWeekOptions(CURRENT_WEEK);

    expect(options).toHaveLength(HISTORY_WEEK_COUNT);
    expect(options[1].weekStart).toBe("2026-08-30T17:00:00.000Z");
    expect(options[2].weekStart).toBe("2026-08-23T17:00:00.000Z");
    expect(options.slice(1).every((week) => !week.isCurrent)).toBe(true);
  });

  it("nhãn là khoảng thứ Hai đến thứ Bảy, đọc theo giờ Việt Nam", () => {
    // Thứ Hai 07/09 đến thứ Bảy 12/09. Đọc theo đồng hồ máy thì máy ở phía tây sẽ ra 06/09.
    const [first] = historyWeekOptions(CURRENT_WEEK);

    expect(first.label).toBe("07/09 - 12/09");
  });

  it("nhãn vẫn đúng khi tuần vắt qua hai tháng", () => {
    const options = historyWeekOptions("2026-08-30T17:00:00.000Z");

    expect(options[0].label).toBe("31/08 - 05/09");
  });
});
