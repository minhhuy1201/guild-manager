import { describe, expect, it } from "vitest";

import {
  PRESENCE_FILTER_LABEL,
  PRESENCE_FILTER_OPTIONS,
  matchesPresenceFilter,
} from "../presence-filter";

describe("matchesPresenceFilter", () => {
  it('"all" giữ lại cả hai đáp án', () => {
    expect(matchesPresenceFilter("all", true)).toBe(true);
    expect(matchesPresenceFilter("all", false)).toBe(true);
  });

  it('"present" chỉ giữ lượt điểm danh "Có"', () => {
    expect(matchesPresenceFilter("present", true)).toBe(true);
    expect(matchesPresenceFilter("present", false)).toBe(false);
  });

  it('"absent" chỉ giữ lượt điểm danh "Không"', () => {
    expect(matchesPresenceFilter("absent", false)).toBe(true);
    expect(matchesPresenceFilter("absent", true)).toBe(false);
  });
});

describe("PRESENCE_FILTER_OPTIONS", () => {
  it('bắt đầu bằng "all" và mọi option đều có nhãn tiếng Việt', () => {
    expect(PRESENCE_FILTER_OPTIONS[0]).toBe("all");
    for (const option of PRESENCE_FILTER_OPTIONS) {
      expect(PRESENCE_FILTER_LABEL[option]).toBeTruthy();
    }
  });
});
