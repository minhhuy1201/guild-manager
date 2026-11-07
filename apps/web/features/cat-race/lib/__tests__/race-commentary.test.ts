import { describe, expect, it } from "vitest";

import type { RaceStanding } from "../race-board";
import type { RaceCue } from "../race-cue";
import {
  COMMENTARY_MIN_GAP_MS,
  INITIAL_COMMENTARY,
  commentOnBoard,
  commentOnCue,
  type CommentaryMemory,
  type CommentaryStep,
} from "../race-commentary";
import { seededRandom } from "./seeded-random";

const NAMES: Record<string, string> = { a: "Mimi", b: "Bông", c: "Tôm", d: "Cải", e: "Lúa", f: "Gạo" };
const nameOf = (key: string) => NAMES[key] ?? "?";
const DURATION_SECONDS = 10;

const cue = (memory: CommentaryMemory, next: RaceCue, now: number, seed = 1): CommentaryStep =>
  commentOnCue(memory, next, { now, nameOf, catCount: 6, random: seededRandom(seed) });

const board = (memory: CommentaryMemory, keys: string[], now: number, lengths: number[] = []) =>
  commentOnBoard(
    memory,
    keys.map<RaceStanding>((key, index) => ({ key, lengthsBehind: lengths[index] ?? index * 3 })),
    { now, nameOf, durationSeconds: DURATION_SECONDS }
  );

/** A memory a moment after the start: `go` was heard at 0 and the last line was long ago. */
const started = (): CommentaryMemory => cue(INITIAL_COMMENTARY, { kind: "go" }, 0).memory;

describe("commentOnCue", () => {
  it("says nothing for the countdown", () => {
    const step = cue(INITIAL_COMMENTARY, { kind: "countdown", step: 0 }, 0);

    expect(step.line).toBeNull();
    expect(step.memory).toBe(INITIAL_COMMENTARY);
  });

  it("shouts at the start and counts the cats", () => {
    const lines = new Set(
      Array.from({ length: 30 }, (_, seed) => cue(INITIAL_COMMENTARY, { kind: "go" }, 0, seed).line)
    );

    expect([...lines].every((line) => line?.isHype)).toBe(true);
    expect([...lines].some((line) => line?.text.includes("6 chú mèo"))).toBe(true);
  });

  it("makes the same line for the same seed", () => {
    expect(cue(INITIAL_COMMENTARY, { kind: "go" }, 0, 7).line).toEqual(
      cue(INITIAL_COMMENTARY, { kind: "go" }, 0, 7).line
    );
  });

  it("calls a sprint and a slow-motion start at once, however soon", () => {
    const afterGo = started();

    const sprint = cue(afterGo, { kind: "sprint" }, 100);
    const slow = cue(sprint.memory, { kind: "slow-motion", isOn: true }, 200);

    expect(sprint.line?.text).toMatch(/[Nn]ước rút/);
    expect(sprint.line?.isHype).toBe(true);
    expect(slow.line?.text).toContain("Chậm lại");
    expect(slow.line?.isHype).toBe(false);
  });

  it("stays silent when slow-motion ends", () => {
    expect(cue(started(), { kind: "slow-motion", isOn: false }, 100).line).toBeNull();
  });

  it("names a new leader, in gold", () => {
    const step = cue(started(), { kind: "lead-change", catKey: "b" }, 5000);

    expect(step.line?.text).toContain("Bông");
    expect(step.line?.isHype).toBe(true);
  });

  it("drops an ordinary lead change that comes too soon after the last line", () => {
    const afterGo = started();

    const early = cue(afterGo, { kind: "lead-change", catKey: "b" }, COMMENTARY_MIN_GAP_MS - 1);
    const later = cue(afterGo, { kind: "lead-change", catKey: "b" }, COMMENTARY_MIN_GAP_MS);

    expect(early.line).toBeNull();
    expect(later.line).not.toBeNull();
  });

  it("does not wait to say a comeback to the front from fifth or worse", () => {
    const afterGo = started();
    const watched = board(afterGo, ["a", "b", "c", "d", "e", "f"], 100).memory;

    const step = cue(watched, { kind: "lead-change", catKey: "e" }, 200);

    expect(step.line?.text).toBe("Lúa từ hạng 5 vọt lên dẫn đầu!");
  });

  it("treats a climb from fourth as an ordinary lead change", () => {
    const watched = board(started(), ["a", "b", "c", "d", "e", "f"], 100).memory;

    const step = cue(watched, { kind: "lead-change", catKey: "d" }, 5000);

    expect(step.line?.text).not.toContain("hạng");
    expect(step.line?.text).toContain("Cải");
  });

  it("mentions the dethroned leader only when there is one", () => {
    const first = cue(INITIAL_COMMENTARY, { kind: "lead-change", catKey: "a" }, 5000, 1);
    const texts = Array.from({ length: 40 }, (_, seed) =>
      cue(first.memory, { kind: "lead-change", catKey: "b" }, 10000, seed).line!.text
    );

    expect(texts.some((text) => text.includes("vượt mặt Mimi"))).toBe(true);
    for (let seed = 0; seed < 40; seed += 1) {
      expect(cue(INITIAL_COMMENTARY, { kind: "lead-change", catKey: "a" }, 5000, seed).line!.text).not.toContain(
        "vượt mặt"
      );
    }
  });

  it("calls a photo finish under half a length, without a name", () => {
    const step = cue(started(), { kind: "finish", lengthsBehind: 0.49 }, 100);

    expect(step.line).toEqual({ text: "Sát nút! Phải soi ảnh đích!", isHype: true });
  });

  it("waits for the referee when the finish was clear, without a name", () => {
    const step = cue(started(), { kind: "finish", lengthsBehind: 0.5 }, 100);

    expect(step.line?.text).toBe("Về đích! Chờ trọng tài xác nhận...");
  });

  it("never names a cat at the finish, after any lead", () => {
    const led = cue(started(), { kind: "lead-change", catKey: "a" }, 5000).memory;
    for (const lengthsBehind of [0, 0.3, 0.5, 2]) {
      const text = cue(led, { kind: "finish", lengthsBehind }, 6000).line!.text;

      for (const name of Object.values(NAMES)) expect(text).not.toContain(name);
    }
  });
});

describe("commentOnBoard", () => {
  const order = ["a", "b", "c", "d", "e", "f"];

  it("says nothing before the race has started", () => {
    expect(board(INITIAL_COMMENTARY, order, 9000).line).toBeNull();
  });

  it("calls a climb from the back into the top three once, after a quarter of the race", () => {
    const memory = board(started(), order, 0).memory;
    const climbed = ["e", "a", "b", "c", "d", "f"];

    expect(board(memory, climbed, 2400).line).toBeNull(); // 24%: too early
    const step = board(memory, climbed, 2600);
    const again = board(step.memory, climbed, 6000);

    expect(step.line?.text).toBe("Chú ý Lúa! Từ cuối đoàn lên hạng 1!");
    expect(again.line?.text ?? "").not.toContain("Chú ý");
  });

  it("ignores a climb of fewer than four places", () => {
    const memory = board(started(), order, 0).memory;

    expect(board(memory, ["d", "a", "b", "c", "e", "f"], 3000).line).toBeNull();
  });

  it("forgets places older than three seconds", () => {
    const old = board(started(), order, 0).memory;
    const recent = board(old, ["e", "a", "b", "c", "d", "f"], 3500);

    expect(recent.line).toBeNull();
  });

  it("keeps a dropped climb for the next update instead of spending it", () => {
    const memory = { ...board(started(), order, 0).memory, lastAt: 500 };
    const climbed = ["e", "a", "b", "c", "d", "f"];

    const dropped = board(memory, climbed, 2600); // 2.1 s after the last line
    const retried = board(dropped.memory, climbed, 2800);

    expect(dropped.line).toBeNull();
    expect(retried.line?.text).toContain("Chú ý Lúa");
  });

  it("marks the half way with the top two, once", () => {
    const memory = board(started(), order, 0).memory;

    const step = board(memory, order, 4600);
    const again = board(step.memory, order, 9000);

    expect(step.line).toEqual({
      text: "Nửa chặng đường. Mimi giữ đầu, Bông bám sát phía sau.",
      isHype: false,
    });
    expect(again.line?.text ?? "").not.toContain("Nửa chặng");
  });

  it("does not mark the half way before 45%", () => {
    expect(board(started(), order, 4400).line).toBeNull();
  });

  it("calls a tight pack between 55% and 80% when the third is under a length", () => {
    const said = new Set(["half"]);
    const memory = { ...started(), said };

    const tight = board(memory, order, 6000, [0, 0.4, 0.9]);
    const loose = board(memory, order, 6000, [0, 0.4, 1]);
    const early = board(memory, order, 5400, [0, 0.4, 0.9]);
    const late = board(memory, order, 8100, [0, 0.4, 0.9]);

    expect(tight.line?.text).toBe("Ba chú mèo dính nhau như sam! Chưa ai dám chắc!");
    expect(loose.line).toBeNull();
    expect(early.line).toBeNull();
    expect(late.line).toBeNull();
    expect(board(tight.memory, order, 9000 - 1500, [0, 0.4, 0.9]).line).toBeNull();
  });

  it("skips the pack call when the gaps are unmeasured", () => {
    const memory = { ...started(), said: new Set(["half"]) };
    const rows = order.map<RaceStanding>((key) => ({ key, lengthsBehind: null }));

    expect(commentOnBoard(memory, rows, { now: 6000, nameOf, durationSeconds: DURATION_SECONDS }).line).toBeNull();
  });

  it("drops a quiet board line within the gap after another line, urgent ones are unaffected", () => {
    const memory = { ...started(), lastAt: 4000 };

    expect(board(memory, order, 4600).line).toBeNull();
    expect(cue(memory, { kind: "sprint" }, 4601).line).not.toBeNull();
  });
});
