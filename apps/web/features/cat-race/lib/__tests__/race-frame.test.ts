import { describe, expect, it } from "vitest";

import { FADE_SECONDS, frameAt, leadersAt, planRace } from "../race-frame";
import {
  FIRST_CHECKPOINT,
  SECOND_CHECKPOINT,
  buildRaceScript,
} from "../race-script";

const AREA = { width: 900, height: 420 };

/**
 * A 240-cat race won by `c0`'s third ticket.
 * @returns The race plan
 */
function bigRace() {
  let state = 5;
  const random = () => {
    state = (state * 16807) % 2147483647;

    return state / 2147483647;
  };
  const script = buildRaceScript({
    entrants: Array.from({ length: 80 }, (_, index) => ({
      characterId: `c${index}`,
      tickets: 3,
    })),
    winner: { characterId: "c0", ticketNo: 3 },
    speed: "NORMAL",
    random,
  });

  return planRace(script, AREA, "horizontal");
}

describe("frameAt", () => {
  const plan = bigRace();
  const duration = plan.script.durationSeconds;

  it("shows the whole field at the start", () => {
    expect(frameAt(plan, 0)).toHaveLength(240);
  });

  it("fades the cut cats out after the first checkpoint", () => {
    const after = frameAt(plan, FIRST_CHECKPOINT * duration + FADE_SECONDS + 0.01);
    const keys = new Set(after.map((cat) => cat.key));

    for (const key of plan.cut) expect(keys.has(key)).toBe(false);
    expect(after.length).toBeLessThan(240);
  });

  it("leaves only the 8 finalists once the sprint begins, all labelled", () => {
    const sprint = frameAt(plan, SECOND_CHECKPOINT * duration + 2);

    expect(sprint).toHaveLength(8);
    expect(sprint.every((cat) => plan.script.finalistKeys.has(cat.key))).toBe(true);
    expect(sprint.every((cat) => cat.labelled)).toBe(true);
  });

  it("puts the winning cat in front at the end of the race", () => {
    expect(leadersAt(plan.script, duration)[0]).toBe(plan.script.winnerKey);
  });

  it("keeps every cat inside the canvas", () => {
    for (const seconds of [0, duration * 0.5, duration * 0.8, duration]) {
      for (const { point } of frameAt(plan, seconds)) {
        expect(point.x).toBeGreaterThanOrEqual(-1);
        expect(point.x).toBeLessThanOrEqual(AREA.width + 1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(AREA.height);
      }
    }
  });
});

describe("leadersAt at the finish", () => {
  it("keeps the winner first when several cats have reached the line, whatever their keys sort like", () => {
    for (const seed of [1, 2, 3]) {
      let state = seed;
      const random = () => {
        state = (state * 16807) % 2147483647;

        return state / 2147483647;
      };
      const script = buildRaceScript({
        entrants: Array.from({ length: 30 }, (_, index) => ({
          characterId: `c${index}`,
          tickets: 1,
        })),
        // "c9" sorts after most other keys, so an alphabetical tie-break would demote it.
        winner: { characterId: "c9", ticketNo: 1 },
        speed: "FAST",
        random,
      });
      const plan = planRace(script, AREA, "horizontal");

      expect(leadersAt(script, plan.endSeconds - 0.01)[0]).toBe(script.winnerKey);
    }
  });
});
