import { describe, expect, it } from "vitest";

import { INITIAL_CHATTER, stepChatter, type ChatFrame, type ChatterState } from "../race-chatter";
import { NARROW_WIDTH } from "../race-layout";
import { seededRandom } from "./seeded-random";

const WIDE = NARROW_WIDTH + 400;
const LABELS = new Map([
  ["cat-1", "Alice"],
  ["cat-2", "Bob"],
  ["cat-long", "Nguyễn Văn Anh Tuấn Kiệt"],
]);
const QUIET = () => 0.99;

/** A frame at `time` with no cue and a calm crowd, patched by the test. */
function frameAt(time: number, patch: Partial<ChatFrame> = {}): ChatFrame {
  return { time, dt: 1 / 60, cues: [], excitement: 0.5, width: WIDE, crowdLeft: 100, labels: LABELS, ...patch };
}

/** Step through `seconds` of frames at 60 Hz. */
function run(state: ChatterState, seconds: number, patch: Partial<ChatFrame>, random: () => number): ChatterState {
  let current = state;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    current = stepChatter(current, frameAt(frame / 60, patch), random);
  }

  return current;
}

const texts = (state: ChatterState) => state.bubbles.map((bubble) => bubble.text);

describe("stepChatter cues", () => {
  it("has the crowd call each countdown number", () => {
    const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "countdown", step: 0 }] }), QUIET);

    expect(texts(state)).toEqual(["3"]);
    expect(state.bubbles[0].anchor.kind).toBe("crowd");
  });

  it("has two spectators shout the start as hype", () => {
    const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "go" }] }), QUIET);

    expect(texts(state)).toEqual(["Chạy điii!", "Chạy điii!"]);
    expect(state.bubbles.map((bubble) => bubble.tone)).toEqual(["hype", "hype"]);
  });

  it("names the new leader, cut short with an ellipsis when long", () => {
    const named = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "lead-change", catKey: "cat-1" }] }), QUIET);
    const long = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "lead-change", catKey: "cat-long" }] }), QUIET);

    expect(texts(named)).toEqual(["Alice lên rồi!"]);
    expect(named.bubbles[0].tone).toBe("lead");
    expect(texts(long)[0]).toMatch(/^.{1,12}… lên rồi!$/);
  });

  it("shouts the sprint and the photo finish", () => {
    const sprint = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "sprint" }] }), QUIET);
    const finish = stepChatter(
      INITIAL_CHATTER,
      frameAt(0, { cues: [{ kind: "finish", lengthsBehind: 0.2 }] }),
      QUIET
    );

    expect(texts(sprint)).toEqual(["NƯỚC RÚT!!"]);
    expect(texts(finish)).toEqual(["Ảnh! Ảnh!"]);
    expect(sprint.bubbles[0].tone).toBe("hype");
  });

  it("says nothing for slow motion", () => {
    const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "slow-motion", isOn: true }] }), QUIET);

    expect(state.bubbles).toEqual([]);
  });

  it("places crowd bubbles inside the stands", () => {
    const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "go" }] }), seededRandom(7));

    for (const bubble of state.bubbles) {
      const anchor = bubble.anchor;
      if (anchor.kind !== "crowd") throw new Error("expected a crowd bubble");
      expect(anchor.x).toBeGreaterThanOrEqual(100);
      expect(anchor.x).toBeLessThanOrEqual(WIDE);
    }
  });
});

describe("stepChatter lifetime and limits", () => {
  it("drops a bubble once its life is over", () => {
    const born = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "sprint" }] }), QUIET);
    const { life } = born.bubbles[0];

    expect(stepChatter(born, frameAt(life - 0.01), QUIET).bubbles).toHaveLength(1);
    expect(stepChatter(born, frameAt(life + 0.01), QUIET).bubbles).toEqual([]);
  });

  it("never holds more than three crowd bubbles, two on a narrow stage", () => {
    const cues = [{ kind: "go" as const }, { kind: "go" as const }, { kind: "go" as const }];

    const wide = stepChatter(INITIAL_CHATTER, frameAt(0, { cues }), QUIET);
    const narrow = stepChatter(INITIAL_CHATTER, frameAt(0, { cues, width: NARROW_WIDTH - 1 }), QUIET);

    expect(wide.bubbles).toHaveLength(3);
    expect(narrow.bubbles).toHaveLength(2);
  });

  it("keeps the cap through a long excited run", () => {
    const state = run(INITIAL_CHATTER, 20, { excitement: 4 }, seededRandom(3));

    expect(state.bubbles.length).toBeLessThanOrEqual(3);
  });

  it("lets a cue push out the oldest random cheer when the crowd is full", () => {
    const cheer = (id: number, bornAt: number) => ({
      id,
      anchor: { kind: "crowd" as const, x: 150 + id },
      text: `cheer ${id}`,
      tone: "plain" as const,
      bornAt,
      life: 5,
      isCue: false,
    });
    const full: ChatterState = { bubbles: [cheer(1, 0), cheer(2, 0.1), cheer(3, 0.2)], nextId: 4 };

    const state = stepChatter(full, frameAt(0.3, { cues: [{ kind: "sprint" }] }), QUIET);

    expect(texts(state)).toEqual(["cheer 2", "cheer 3", "NƯỚC RÚT!!"]);
  });
});

describe("stepChatter random cheers", () => {
  it("calls out more when the crowd is more excited", () => {
    const count = (excitement: number) => {
      let spawned = 0;
      let state = INITIAL_CHATTER;
      const random = seededRandom(11);
      for (let frame = 0; frame < 60 * 60; frame += 1) {
        const next = stepChatter(state, frameAt(frame / 60, { excitement }), random);
        spawned += next.nextId - state.nextId;
        state = next;
      }

      return spawned;
    };

    expect(count(4)).toBeGreaterThan(count(0.5) * 3);
  });

  it("uses plain cheers from a fixed list", () => {
    const state = run(INITIAL_CHATTER, 30, { excitement: 4 }, seededRandom(5));

    expect(state.bubbles.length).toBeGreaterThan(0);
    for (const bubble of state.bubbles) {
      expect(bubble.isCue).toBe(false);
      expect(bubble.text.length).toBeGreaterThan(0);
    }
  });
});

describe("stepChatter purity", () => {
  it("leaves the state it was given untouched", () => {
    const before = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "go" }] }), QUIET);
    const snapshot = structuredClone(before);

    stepChatter(before, frameAt(100, { cues: [{ kind: "sprint" }], excitement: 4 }), seededRandom(1));

    expect(before).toEqual(snapshot);
  });
});
