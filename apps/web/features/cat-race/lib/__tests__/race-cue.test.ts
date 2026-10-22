import { describe, expect, it } from "vitest";

import {
  INITIAL_CUE_CURSOR,
  LEAD_CHANGE_FROM_U,
  nextCues,
  type CueCursor,
  type FinishCue,
  type RaceCue,
} from "../race-cue";
import { momentAt } from "../race-timeline";

const DURATION = 20;
const FINISH: FinishCue = { kind: "finish", lengthsBehind: 2 };

/**
 * Walk a round frame by frame and collect the cues.
 * @param frames - Seconds since the first lantern, one per frame
 * @param leaderAt - Who leads at each frame's race time
 * @returns Every cue in order
 */
function play(frames: readonly number[], leaderAt: (u: number) => string = () => "a"): RaceCue[] {
  let cursor: CueCursor = INITIAL_CUE_CURSOR;
  const cues: RaceCue[] = [];
  for (const elapsed of frames) {
    const moment = momentAt(elapsed, DURATION);
    const step = nextCues(cursor, moment, leaderAt(moment.u), FINISH);
    cursor = step.cursor;
    cues.push(...step.cues);
  }

  return cues;
}

const everyFrame = Array.from({ length: 2000 }, (_, index) => index * 0.0125);

describe("nextCues", () => {
  it("announces each countdown step once, then go, sprint, slow motion on and off, and the finish", () => {
    const cues = play(everyFrame);

    expect(cues.map((cue) => cue.kind)).toEqual([
      "countdown",
      "countdown",
      "countdown",
      "go",
      "sprint",
      "slow-motion",
      "slow-motion",
      "finish",
    ]);
    expect(cues.filter((cue) => cue.kind === "countdown")).toEqual([
      { kind: "countdown", step: 0 },
      { kind: "countdown", step: 1 },
      { kind: "countdown", step: 2 },
    ]);
    expect(cues.filter((cue) => cue.kind === "slow-motion")).toEqual([
      { kind: "slow-motion", isOn: true },
      { kind: "slow-motion", isOn: false },
    ]);
    expect(cues.at(-1)).toBe(FINISH);
  });

  it("still announces every step when frames jump over them, in order", () => {
    const cues = play([0, 5, 40]);

    expect(cues.map((cue) => cue.kind)).toEqual([
      "countdown",
      "countdown",
      "countdown",
      "go",
      "sprint",
      "finish",
    ]);
  });

  it("announces a lead change once the pack has sorted itself out, not before", () => {
    const early = 2.4 + DURATION * 0.05;
    const late = 2.4 + DURATION * 0.5;
    const leaders = new Map([
      [0, "a"],
      [1, "b"],
      [2, "c"],
    ]);
    const frames = [0, early, late];
    let index = 0;
    const cues = play(frames, () => leaders.get(index++)!);

    expect(momentAt(early, DURATION).u).toBeLessThan(LEAD_CHANGE_FROM_U);
    expect(cues.filter((cue) => cue.kind === "lead-change")).toEqual([{ kind: "lead-change", catKey: "c" }]);
  });

  it("announces nothing for the first look at the leader", () => {
    const cues = play([0], () => "z");

    expect(cues.filter((cue) => cue.kind === "lead-change")).toEqual([]);
  });

  it("announces the finish once however long the hold", () => {
    const cues = play([25, 25.1, 25.2, 25.3, 25.4]);

    expect(cues.filter((cue) => cue.kind === "finish")).toHaveLength(1);
  });
});
