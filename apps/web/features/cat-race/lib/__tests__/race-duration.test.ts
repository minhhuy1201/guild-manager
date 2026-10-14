import { describe, expect, it } from "vitest";

import { parseRaceDuration } from "../race-duration";

describe("parseRaceDuration", () => {
  it.each([
    ["10", 10],
    ["12", 12],
    [" 40 ", 40],
  ])("accepts %j", (raw, seconds) => {
    expect(parseRaceDuration(raw)).toBe(seconds);
  });

  it.each(["9", "41", "12.5", "", "abc", "-12", "1e1"])("rejects %j", (raw) => {
    expect(parseRaceDuration(raw)).toBeNull();
  });
});
