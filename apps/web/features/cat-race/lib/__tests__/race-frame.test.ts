import { describe, expect, it } from "vitest";

import { catLabels } from "../cat-label";
import { frameAt, planRace } from "../race-frame";
import { buildRaceScript, rankAt } from "../race-script";

const VIEWPORT = { width: 900, height: 420 };

/**
 * A race of `people` entrants with `tickets` each, won by `c0`'s last ticket.
 * @param people - Entrants
 * @param tickets - Tickets each
 * @returns The plan
 */
function raceOf(people: number, tickets: number) {
  let state = 5;
  const random = () => {
    state = (state * 16807) % 2147483647;

    return state / 2147483647;
  };
  const script = buildRaceScript({
    entrants: Array.from({ length: people }, (_, index) => ({
      characterId: `c${index}`,
      tickets,
    })),
    winner: { characterId: "c0", ticketNo: tickets },
    durationSeconds: 12,
    random,
  });
  const participants = Array.from({ length: people }, (_, index) => ({
    characterId: `c${index}`,
    name: `Người ${index}`,
  })) as never;

  return planRace(script, VIEWPORT, catLabels(script.cats, participants));
}

describe("frameAt", () => {
  const plan = raceOf(80, 3);
  const duration = plan.script.durationSeconds;

  it("puts every one of the 240 cats on the same start line, one per lane", () => {
    const frame = frameAt(plan, 0);

    expect(frame).toHaveLength(240);
    expect(new Set(frame.map((cat) => cat.x)).size).toBe(1);
    expect(frame[0].x).toBe(plan.layout.startX);
    expect(new Set(frame.map((cat) => cat.y)).size).toBe(240);
  });

  it("puts cats at the same progress at the same x, so the track agrees with the ranking", () => {
    const frame = frameAt(plan, duration * 0.6);
    const ranking = rankAt(plan.script, duration * 0.6);
    const xOf = new Map(frame.map((cat) => [cat.key, cat.x]));

    for (let index = 1; index < ranking.length; index += 1) {
      expect(xOf.get(ranking[index - 1])!).toBeGreaterThanOrEqual(xOf.get(ranking[index])!);
    }
  });

  it("ends with the winner on the finish line and everyone else short of it", () => {
    const frame = frameAt(plan, duration);
    const noseOf = (x: number) => x + plan.layout.catWidth;
    const winner = frame.find((cat) => cat.key === plan.script.winnerKey)!;

    expect(noseOf(winner.x)).toBeCloseTo(plan.layout.finishX);
    for (const cat of frame) {
      if (cat.key !== winner.key) expect(noseOf(cat.x)).toBeLessThan(plan.layout.finishX);
    }
  });

  it("holds still after the winner crossed", () => {
    expect(frameAt(plan, duration + 0.5)).toEqual(frameAt(plan, duration));
  });

  it("never moves a cat backwards", () => {
    const last = new Map(frameAt(plan, 0).map((cat) => [cat.key, cat.x]));
    for (let t = 0.1; t <= duration; t += 0.1) {
      for (const cat of frameAt(plan, t)) {
        expect(cat.x).toBeGreaterThanOrEqual(last.get(cat.key)! - 1e-9);
        last.set(cat.key, cat.x);
      }
    }
  });
});

describe("planRace lanes", () => {
  it("orders lanes by label with numbers read as numbers, so a name is easy to find", () => {
    const plan = raceOf(12, 1);

    expect(plan.laneOrder).toEqual(Array.from({ length: 12 }, (_, index) => `c${index}#1`));
  });

  it("follows a chosen order, drops keys that left the race and puts new keys last", () => {
    const { script } = raceOf(4, 1);
    const labels = catLabels(
      script.cats,
      script.cats.map((cat, index) => ({ characterId: cat.characterId, name: `Người ${index}` })) as never
    );
    const plan = planRace(script, VIEWPORT, labels, ["c2#1", "gone#1", "c0#1"]);

    expect(plan.laneOrder).toEqual(["c2#1", "c0#1", "c1#1", "c3#1"]);
    expect(plan.laneOf.get("c0#1")).toBe(1);
  });

  it("keeps lane heights at the minimum for 240 cats", () => {
    expect(raceOf(80, 3).layout.laneHeight).toBeGreaterThanOrEqual(22);
  });
});

describe("catLabels", () => {
  it("adds #n only when one person runs several cats", () => {
    const script = buildRaceScript({
      entrants: [
        { characterId: "a", tickets: 2 },
        { characterId: "b", tickets: 1 },
      ],
      winner: { characterId: "a", ticketNo: 1 },
      durationSeconds: 10,
      random: () => 0.5,
    });
    const labels = catLabels(script.cats, [
      { characterId: "a", name: "An" },
      { characterId: "b", name: "Bình" },
    ] as never);

    expect([...labels.values()].sort()).toEqual(["An #1", "An #2", "Bình"]);
  });

  it("falls back to a question mark for a missing participant", () => {
    const script = buildRaceScript({
      entrants: [
        { characterId: "a", tickets: 1 },
        { characterId: "x", tickets: 1 },
      ],
      winner: { characterId: "a", ticketNo: 1 },
      durationSeconds: 10,
      random: () => 0.5,
    });

    expect(catLabels(script.cats, [{ characterId: "a", name: "An" }] as never).get("x#1")).toBe("?");
  });
});
