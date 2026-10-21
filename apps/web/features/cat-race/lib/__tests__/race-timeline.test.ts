import { describe, expect, it } from "vitest";

import {
  COUNTDOWN_SECONDS,
  FINISH_HOLD_SECONDS,
  PHOTO_FINISH_GAP,
  PHOTO_HOLD_SECONDS,
  finishHoldSeconds,
  momentAt,
  raceTimeAt,
  totalSeconds,
} from "../race-timeline";

const DURATION = 20;
const FAR_GAP = 0.05;
const CLOSE_GAP = 0.001;

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
    expect(momentAt(0, DURATION, FAR_GAP)).toMatchObject({ phase: "countdown", countdownStep: 0, u: 0 });
    expect(momentAt(0.79, DURATION, FAR_GAP).countdownStep).toBe(0);
    expect(momentAt(0.8, DURATION, FAR_GAP).countdownStep).toBe(1);
    expect(momentAt(1.6, DURATION, FAR_GAP).countdownStep).toBe(2);
    expect(momentAt(2.39, DURATION, FAR_GAP)).toMatchObject({ phase: "countdown", countdownStep: 2 });
  });

  it("starts running at 2.4 seconds with the cats still on the line", () => {
    expect(COUNTDOWN_SECONDS).toBeCloseTo(2.4);
    expect(momentAt(COUNTDOWN_SECONDS, DURATION, FAR_GAP)).toEqual({
      phase: "running",
      countdownStep: null,
      u: 0,
      isSprint: false,
      isSlow: false,
    });
  });

  it("announces the sprint from u = 0.84 and slow motion from u = 0.9 (74% of the duration)", () => {
    const justBefore = momentAt(afterGo(DURATION * 0.739), DURATION, FAR_GAP);
    const atNinety = momentAt(afterGo(DURATION * 0.741), DURATION, FAR_GAP);

    expect(justBefore.isSlow).toBe(false);
    expect(justBefore.isSprint).toBe(true);
    expect(atNinety.isSlow).toBe(true);
    expect(atNinety.u).toBeGreaterThanOrEqual(0.9);
    expect(momentAt(afterGo(DURATION * 0.5), DURATION, FAR_GAP).isSprint).toBe(false);
  });

  it("puts the winner on the line exactly at the typed duration", () => {
    expect(momentAt(afterGo(DURATION - 0.01), DURATION, FAR_GAP)).toMatchObject({ phase: "running" });
    expect(momentAt(afterGo(DURATION), DURATION, FAR_GAP)).toMatchObject({ phase: "finish", u: 1, isSlow: false });
  });

  it("holds 0.9 seconds after a clear finish, then is done", () => {
    expect(momentAt(afterGo(DURATION + FINISH_HOLD_SECONDS - 0.01), DURATION, FAR_GAP).phase).toBe("finish");
    expect(momentAt(afterGo(DURATION + FINISH_HOLD_SECONDS + 0.001), DURATION, FAR_GAP)).toMatchObject({
      phase: "done",
      u: 1,
    });
  });

  it("holds 2.6 seconds on a photo finish, then is done", () => {
    expect(momentAt(afterGo(DURATION + 1), DURATION, CLOSE_GAP).phase).toBe("photo");
    expect(momentAt(afterGo(DURATION + PHOTO_HOLD_SECONDS - 0.01), DURATION, CLOSE_GAP).phase).toBe("photo");
    expect(momentAt(afterGo(DURATION + PHOTO_HOLD_SECONDS + 0.001), DURATION, CLOSE_GAP).phase).toBe("done");
  });
});

describe("finishHoldSeconds", () => {
  it("is long only when the runner-up is closer than the photo gap", () => {
    expect(finishHoldSeconds(PHOTO_FINISH_GAP - 0.0001)).toBe(PHOTO_HOLD_SECONDS);
    expect(finishHoldSeconds(PHOTO_FINISH_GAP)).toBe(FINISH_HOLD_SECONDS);
    expect(finishHoldSeconds(1)).toBe(FINISH_HOLD_SECONDS);
  });

  it("adds the countdown, the race and the hold", () => {
    expect(totalSeconds(DURATION, FAR_GAP)).toBeCloseTo(2.4 + DURATION + 0.9);
    expect(totalSeconds(DURATION, CLOSE_GAP)).toBeCloseTo(2.4 + DURATION + 2.6);
  });
});
