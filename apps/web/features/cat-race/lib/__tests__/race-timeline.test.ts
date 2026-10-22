import { describe, expect, it } from "vitest";

import {
  COUNTDOWN_SECONDS,
  PHOTO_HOLD_SECONDS,
  momentAt,
  raceTimeAt,
  totalSeconds,
} from "../race-timeline";

const DURATION = 20;

/** Seconds since the first lantern for a number of seconds after "go". */
const afterGo = (seconds: number) => COUNTDOWN_SECONDS + seconds;

describe("raceTimeAt", () => {
  it("maps the wall share onto race time, slowing down from 74% on", () => {
    expect(raceTimeAt(-1)).toBe(0);
    expect(raceTimeAt(0)).toBe(0);
    expect(raceTimeAt(0.37)).toBeCloseTo(0.45);
    expect(raceTimeAt(0.74)).toBeCloseTo(0.9);
    expect(raceTimeAt(0.87)).toBeCloseTo(0.95);
    expect(raceTimeAt(1)).toBe(1);
    expect(raceTimeAt(2)).toBe(1);
  });

  it("plays the last tenth of the track about three times slower", () => {
    const before = raceTimeAt(0.5) - raceTimeAt(0.4);
    const after = raceTimeAt(0.95) - raceTimeAt(0.85);

    expect(before / after).toBeGreaterThan(3);
  });
});

describe("momentAt", () => {
  it("counts down three steps of 0.8 seconds", () => {
    expect(momentAt(0, DURATION)).toMatchObject({ phase: "countdown", countdownStep: 0, u: 0 });
    expect(momentAt(0.79, DURATION).countdownStep).toBe(0);
    expect(momentAt(0.8, DURATION).countdownStep).toBe(1);
    expect(momentAt(1.6, DURATION).countdownStep).toBe(2);
    expect(momentAt(2.39, DURATION)).toMatchObject({ phase: "countdown", countdownStep: 2 });
  });

  it("starts running at 2.4 seconds with the cats still on the line", () => {
    expect(COUNTDOWN_SECONDS).toBeCloseTo(2.4);
    expect(momentAt(COUNTDOWN_SECONDS, DURATION)).toEqual({
      phase: "running",
      countdownStep: null,
      u: 0,
      isSprint: false,
      isSlow: false,
    });
  });

  it("announces the sprint from u = 0.84 and slow motion from u = 0.9 (74% of the duration)", () => {
    const justBefore = momentAt(afterGo(DURATION * 0.739), DURATION);
    const atNinety = momentAt(afterGo(DURATION * 0.741), DURATION);

    expect(justBefore.isSlow).toBe(false);
    expect(justBefore.isSprint).toBe(true);
    expect(atNinety.isSlow).toBe(true);
    expect(atNinety.u).toBeGreaterThanOrEqual(0.9);
    expect(momentAt(afterGo(DURATION * 0.5), DURATION).isSprint).toBe(false);
  });

  it("puts the winner on the line exactly at the typed duration", () => {
    expect(momentAt(afterGo(DURATION - 0.01), DURATION)).toMatchObject({ phase: "running" });
    expect(momentAt(afterGo(DURATION), DURATION)).toMatchObject({ phase: "photo", u: 1, isSlow: false });
  });

  it("always holds the finish photo for 2.6 seconds, then is done", () => {
    expect(PHOTO_HOLD_SECONDS).toBe(2.6);
    expect(momentAt(afterGo(DURATION), DURATION)).toMatchObject({ phase: "photo", u: 1 });
    expect(momentAt(afterGo(DURATION + PHOTO_HOLD_SECONDS - 0.01), DURATION).phase).toBe("photo");
    expect(momentAt(afterGo(DURATION + PHOTO_HOLD_SECONDS + 0.001), DURATION)).toMatchObject({
      phase: "done",
      u: 1,
    });
  });
});

describe("totalSeconds", () => {
  it("adds the countdown, the race and the photo hold", () => {
    expect(totalSeconds(DURATION)).toBeCloseTo(2.4 + DURATION + 2.6);
  });
});
