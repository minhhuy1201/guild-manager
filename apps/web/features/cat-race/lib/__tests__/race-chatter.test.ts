import { describe, expect, it } from "vitest";

import { INITIAL_CHATTER, stepChatter, type ChatFrame, type ChatterState } from "../race-chatter";
import { NARROW_WIDTH } from "../race-layout";
import { seededRandom } from "./seeded-random";

const WIDE = NARROW_WIDTH + 400;
const LABELS = new Map([
  ["cat-1", "Alice"],
  ["cat-2", "Bob"],
  ["cat-long", "Nguyễn Văn Anh Tuấn Kiệt"],
  ["cat-shared-1", "Nguyễn Văn Anh Tuấn #1"],
  ["cat-shared-2", "Nguyễn Văn Anh Tuấn #2"],
  ["cat-emoji", "Mèo Mướp 😺😺😺😺😺"],
]);
const QUIET = () => 0.99;
const NO_CATS = { visible: [], ranks: null };
const KEYS = Array.from({ length: 10 }, (_, index) => `k${index}`);
/** Ten cats in view, running in key order. */
const PACK = { visible: KEYS, ranks: KEYS };

/** A frame at `time` with no cue and a calm crowd, patched by the test. */
function frameAt(time: number, patch: Partial<ChatFrame> = {}): ChatFrame {
  return { time, dt: 1 / 60, cues: [], excitement: 0.5, width: WIDE, crowdLeft: 100, labels: LABELS, cats: NO_CATS, ...patch };
}

/** Step through `seconds` of frames at 60 Hz. */
function run(state: ChatterState, seconds: number, patch: Partial<ChatFrame>, random: () => number): ChatterState {
  let current = state;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    current = stepChatter(current, frameAt(frame / 60, patch), random);
  }

  return current;
}

/** What the stands say; the cats' own bubbles are read apart. */
const texts = (state: ChatterState) =>
  state.bubbles.filter((bubble) => bubble.anchor.kind === "crowd").map((bubble) => bubble.text);

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

  it("keeps the ticket suffix when it cuts a shared owner's name, so two cats stay apart", () => {
    const callOut = (catKey: string) =>
      texts(stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "lead-change", catKey }] }), QUIET))[0];

    expect(callOut("cat-shared-1")).toBe("Nguyễn Văn A… #1 lên rồi!");
    expect(callOut("cat-shared-2")).toBe("Nguyễn Văn A… #2 lên rồi!");
  });

  it("never cuts an emoji in half", () => {
    const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "lead-change", catKey: "cat-emoji" }] }), QUIET);

    expect(texts(state)[0]).toBe("Mèo Mướp 😺😺😺… lên rồi!");
    expect(texts(state)[0].isWellFormed()).toBe(true);
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

const catBubbles = (state: ChatterState) => state.bubbles.filter((bubble) => bubble.anchor.kind === "cat");

describe("stepChatter cat meows", () => {
  it("has the new leader meow loudly, anchored to that cat", () => {
    const state = stepChatter(
      INITIAL_CHATTER,
      frameAt(0, { cues: [{ kind: "lead-change", catKey: "cat-2" }], cats: PACK }),
      QUIET
    );

    expect(catBubbles(state)).toMatchObject([{ anchor: { kind: "cat", catKey: "cat-2" }, text: "MEOW!!", tone: "lead" }]);
    expect(texts(state)).toContain("Bob lên rồi!");
  });

  it("has two or three cats in view howl at the sprint", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "sprint" }], cats: PACK }), seededRandom(seed));
      const howls = catBubbles(state);

      expect(howls.length).toBeGreaterThanOrEqual(2);
      expect(howls.length).toBeLessThanOrEqual(3);
      expect(howls.every((bubble) => bubble.text === "MEEEOW!!" && bubble.tone === "hype")).toBe(true);
      expect(new Set(howls.map((bubble) => JSON.stringify(bubble.anchor))).size).toBe(howls.length);
      for (const bubble of howls) {
        expect(KEYS).toContain((bubble.anchor as { catKey: string }).catKey);
      }
    }
  });

  it("howls with no cat when none is in view", () => {
    const state = stepChatter(INITIAL_CHATTER, frameAt(0, { cues: [{ kind: "sprint" }], cats: NO_CATS }), QUIET);

    expect(catBubbles(state)).toEqual([]);
  });

  it("never holds more than four cat bubbles", () => {
    const state = run(INITIAL_CHATTER, 30, { excitement: 4, cats: PACK }, seededRandom(9));
    const sprint = stepChatter(state, frameAt(31, { cues: [{ kind: "sprint" }, { kind: "sprint" }], cats: PACK }), seededRandom(2));

    expect(catBubbles(state).length).toBeLessThanOrEqual(4);
    expect(catBubbles(sprint).length).toBeLessThanOrEqual(4);
  });

  it("only picks cats in view and gives one cat one bubble", () => {
    const state = run(INITIAL_CHATTER, 30, { excitement: 4, cats: { visible: ["k3", "k4"], ranks: KEYS } }, seededRandom(4));
    const keys = catBubbles(state).map((bubble) => (bubble.anchor as { catKey: string }).catKey);

    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every((key) => key === "k3" || key === "k4")).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("lets the last fifth of the pack complain of being tired", () => {
    const tail = { visible: ["k9"], ranks: KEYS };
    const front = { visible: ["k0"], ranks: KEYS };
    const sayings = (cats: ChatFrame["cats"]) => {
      const seen = new Set<string>();
      const random = seededRandom(8);
      let state = INITIAL_CHATTER;
      for (let frame = 0; frame < 60 * 120; frame += 1) {
        state = stepChatter(state, frameAt(frame / 60, { excitement: 4, cats }), random);
        for (const bubble of catBubbles(state)) seen.add(bubble.text);
      }

      return seen;
    };

    expect(sayings(tail).has("hộc hộc")).toBe(true);
    expect(sayings(front).has("hộc hộc")).toBe(false);
    expect(sayings(front).has("meow")).toBe(true);
  });

  it("makes no cat meow before the race gives a ranking", () => {
    const state = run(INITIAL_CHATTER, 10, { excitement: 4, cats: { visible: KEYS, ranks: null } }, seededRandom(6));

    expect(catBubbles(state)).toEqual([]);
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
