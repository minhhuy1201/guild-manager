import { afterEach, describe, expect, it } from "vitest";

import { deadlineCapFor, isWithinDeadlineCap } from "@guild/shared/lib";

import { fromInputValue, toInstant, toInputValue } from "../datetime-input";

/** The zone vitest pins for the rest of the suite, restored after every case here. */
const PINNED_TZ = process.env.TZ;

/**
 * Zones the two functions must answer identically in: Vietnam itself, the zone CI runs (UTC, which
 * is what hid this bug), one behind UTC and one ahead of Vietnam.
 */
const ZONES = ["Asia/Ho_Chi_Minh", "UTC", "America/New_York", "Australia/Sydney"];

afterEach(() => {
  process.env.TZ = PINNED_TZ;
});

/**
 * Run an assertion with the process clock set to a given zone.
 * @param timeZone - IANA zone name
 * @param assert - The assertion to run there
 */
function inZone(timeZone: string, assert: () => void): void {
  process.env.TZ = timeZone;
  assert();
}

describe("datetime-input", () => {
  it.each(ZONES)("đổi ISO sang chuỗi datetime-local theo UTC+7, ở %s", (tz) => {
    inZone(tz, () => {
      expect(toInputValue("2026-07-21T13:30:00.000Z")).toBe("2026-07-21T20:30");
    });
  });

  it.each(ZONES)("đổi chuỗi datetime-local ngược lại thành ISO, ở %s", (tz) => {
    inZone(tz, () => {
      expect(fromInputValue("2026-07-21T20:30")).toBe(
        "2026-07-21T13:30:00.000Z"
      );
    });
  });

  it.each(ZONES)("đi vòng tròn không đổi giá trị, ở %s", (tz) => {
    inZone(tz, () => {
      const iso = "2026-07-25T13:00:00.000Z";

      expect(fromInputValue(toInputValue(iso))).toBe(iso);
    });
  });

  it.each(ZONES)("qua nửa đêm giờ Việt Nam vẫn đúng ngày, ở %s", (tz) => {
    // 17:30 UTC là 00:30 hôm sau ở Việt Nam. Lệch múi giờ ở đây đổi cả ngày, không chỉ giờ, nên đây
    // là ca duy nhất phân biệt được "cộng 7 tiếng" với "đọc đồng hồ máy".
    inZone(tz, () => {
      expect(toInputValue("2026-07-25T17:30:00.000Z")).toBe("2026-07-26T00:30");
      expect(fromInputValue("2026-07-26T00:30")).toBe(
        "2026-07-25T17:30:00.000Z"
      );
    });
  });

  it.each(ZONES)("đọc ô nhập ra đúng mốc thời gian, ở %s", (tz) => {
    inZone(tz, () => {
      expect(toInstant("2026-07-21T20:30").toISOString()).toBe(
        "2026-07-21T13:30:00.000Z"
      );
    });
  });

  it.each(ZONES)("luật hạn chót chấm trên giá trị đúng, ở %s", (tz) => {
    // Đây là hậu quả thật của lỗi: `deadlineCapFor` chốt 10:00 giờ Việt Nam. Đọc ô nhập theo đồng hồ
    // máy thì phép so vẫn "nhất quán" với chính nó nhưng chấm sai mốc, và không ai thấy gì.
    inZone(tz, () => {
      const battle = toInstant("2026-07-21T20:30");

      expect(deadlineCapFor(battle).toISOString()).toBe(
        "2026-07-21T03:00:00.000Z"
      );
      expect(isWithinDeadlineCap(toInstant("2026-07-21T10:00"), battle)).toBe(
        true
      );
      expect(isWithinDeadlineCap(toInstant("2026-07-21T10:01"), battle)).toBe(
        false
      );
    });
  });
});
