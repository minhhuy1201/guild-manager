import { describe, expect, it } from "vitest";

import {
  IDLE_CLOCK,
  clockSeconds,
  formatClock,
  isClockRunning,
  startClock,
  stopClock,
} from "../race-clock";

describe("race clock", () => {
  it("reads zero before it starts", () => {
    expect(clockSeconds(IDLE_CLOCK, 5000)).toBe(0);
    expect(isClockRunning(IDLE_CLOCK)).toBe(false);
  });

  it("counts the seconds since go while it runs", () => {
    const clock = startClock(1000);

    expect(isClockRunning(clock)).toBe(true);
    expect(clockSeconds(clock, 6300)).toBeCloseTo(5.3);
  });

  it("freezes at the stop and ignores a second stop", () => {
    const stopped = stopClock(startClock(1000), 4000);

    expect(isClockRunning(stopped)).toBe(false);
    expect(clockSeconds(stopped, 99000)).toBe(3);
    expect(stopClock(stopped, 8000)).toBe(stopped);
  });

  it("does not stop a clock that never started", () => {
    expect(stopClock(IDLE_CLOCK, 100)).toBe(IDLE_CLOCK);
  });

  it("is written with one decimal and a leading zero", () => {
    expect(formatClock(0)).toBe("00.0s");
    expect(formatClock(5.34)).toBe("05.3s");
    expect(formatClock(12.96)).toBe("13.0s");
  });
});
