// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { CatRaceParticipant } from "@guild/shared/schemas";

// next/font only works through the Next compiler; the stage font is a stand-in here.
vi.mock("next/font/google", () => ({
  Bungee: () => ({ variable: "bungee-variable", style: { fontFamily: "'Bungee', 'Bungee Fallback'" } }),
}));
// The bubbles are painted by their own module; a spy keeps their text apart from the canvas's own lettering.
const { paintChatBubble } = vi.hoisted(() => ({ paintChatBubble: vi.fn() }));
vi.mock("../../lib/paint-chat-bubbles", () => ({ paintChatBubble }));
// A pass-through spy: the sky is drawn once per size, which a shuffle must not repeat.
vi.mock("../../lib/stage-backdrop", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../lib/stage-backdrop")>();

  return { ...original, renderBackdrop: vi.fn(original.renderBackdrop) };
});
vi.mock("@/features/auth", () => ({
  discordAvatarUrl: (id: string, hash: string | null) =>
    hash ? `https://cdn.test/${id}/${hash}.png` : null,
}));

import { LANE_SHUFFLE_MS } from "../../lib/lane-shuffle";
import { laneCenterY, laneLayout, markX } from "../../lib/race-layout";
import type { RaceStanding } from "../../lib/race-board";
import { buildRaceScript, rankAt } from "../../lib/race-script";
import { renderBackdrop } from "../../lib/stage-backdrop";
import { STAGE_PALETTE } from "../../lib/stage-palette";
import { seededRandom } from "../../lib/__tests__/seeded-random";
import { RaceCanvas } from "../race-canvas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A 2D context that accepts every call; text, colours, rectangles and sprites are recorded to read what got painted. */
const fillText = vi.fn();
const fills: unknown[] = [];
const fonts: string[] = [];
const rects: [number, number, number, number][] = [];
const sprites: { x: number; y: number }[] = [];
const GRADIENT = { addColorStop: () => undefined };
const fakeContext = new Proxy(
  {},
  {
    get: (_target, property) => {
      if (property === "fillText") return fillText;
      if (property === "createLinearGradient" || property === "createRadialGradient") return () => GRADIENT;
      if (property === "measureText") return (text: string) => ({ width: text.length * 7 });
      if (property === "fillRect") {
        return (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]);
      }
      if (property === "drawImage") {
        return (_image: unknown, x: number, y: number) => sprites.push({ x, y });
      }

      return () => undefined;
    },
    set: (_target, property, value) => {
      if (property === "fillStyle") fills.push(value);
      if (property === "font") fonts.push(String(value));

      return true;
    },
  }
);

/** A real frame timestamp is never 0, which the canvas reads as 'not started yet'. */
const START_MS = 1000;
const frames: FrameRequestCallback[] = [];
const resizeObservers: { disconnect: ReturnType<typeof vi.fn> }[] = [];

/** jsdom has no matchMedia; this answers the reduced-motion query only. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
}

/** Run the next queued animation frame at `now` ms. */
function runFrame(now: number) {
  const callback = frames.shift();
  if (!callback) throw new Error("no frame queued");
  callback(now);
}

/**
 * Run frames from the start until the race calls `onFinish`.
 * @param onFinish - The spy passed to the canvas
 */
function runToEnd(onFinish: ReturnType<typeof vi.fn>) {
  for (let now = 0; now < 120_000 && !onFinish.mock.calls.length; now += 500) {
    runFrame(now);
  }
}

/**
 * Two people, one running three cats, so labels carry a `#n` suffix.
 * @param withAvatar - Give the first person a Discord avatar
 */
function participants(withAvatar: boolean): CatRaceParticipant[] {
  return [
    {
      characterId: "a",
      name: "Alice",
      guildClass: GuildClass.TO_VAN,
      discordId: withAvatar ? "111" : null,
      discordAvatar: withAvatar ? "hash" : null,
      tickets: 3,
    },
    {
      characterId: "b",
      name: "Bob",
      guildClass: GuildClass.TO_VAN,
      discordId: null,
      discordAvatar: null,
      tickets: 1,
    },
  ];
}

const SCRIPT = buildRaceScript({
  entrants: [
    { characterId: "a", tickets: 3 },
    { characterId: "b", tickets: 1 },
  ],
  winner: { characterId: "a", ticketNo: 2 },
  durationSeconds: 10,
  random: () => 0.5,
});

beforeEach(() => {
  fills.length = 0;
  fonts.length = 0;
  rects.length = 0;
  sprites.length = 0;
  frames.length = 0;
  resizeObservers.length = 0;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => frames.push(callback))
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  stubReducedMotion(false);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect = vi.fn();
      observe = vi.fn();
      constructor() {
        resizeObservers.push(this);
      }
    }
  );
  vi.stubGlobal(
    "Image",
    class {
      complete = true;
      naturalWidth = 10;
      src = "";
    }
  );
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext) as never;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 400 });
});

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  fillText.mockClear();
  paintChatBubble.mockClear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

/**
 * A race of `people` single-ticket entrants, won by `c0`.
 * @param people - Entrants
 * @returns The script and who ran
 */
function bigField(people: number) {
  const script = buildRaceScript({
    entrants: Array.from({ length: people }, (_, index) => ({ characterId: `c${index}`, tickets: 1 })),
    winner: { characterId: "c0", ticketNo: 1 },
    durationSeconds: 10,
    random: () => 0.5,
  });
  const racers = Array.from({ length: people }, (_, index) => ({
    characterId: `c${index}`,
    name: `Người ${index}`,
    guildClass: GuildClass.TO_VAN,
    discordId: null,
    discordAvatar: null,
    tickets: 1,
  }));

  return { script, racers };
}

/**
 * A start-line preview with a chosen lane order.
 * @param script - The race
 * @param racers - Who ran
 * @param order - Cat keys from the top lane down, or null for A to Z
 */
function shuffleCanvas(
  script: ReturnType<typeof bigField>["script"],
  racers: ReturnType<typeof bigField>["racers"],
  order: string[] | null
) {
  return (
    <RaceCanvas
      mode="start"
      script={script}
      participants={racers}
      onFinish={vi.fn()}
      skipSignal={0}
      onStandings={vi.fn()}
      onCue={vi.fn()}
      laneOrder={order}
    />
  );
}

/** The y each "Người n" name was last painted at since `fillText` was cleared. */
function nameYs(): Map<string, number> {
  return new Map(
    fillText.mock.calls
      .filter(([text]) => typeof text === "string" && text.startsWith("Người "))
      .map(([text, , y]) => [text as string, y as number])
  );
}

describe("RaceCanvas", () => {
  it("paints no countdown of its own", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(START_MS);

    const digits = fillText.mock.calls.map((call) => String(call[0])).filter((text) => /^[123]$/.test(text));
    expect(digits).toEqual([]);
  });

  it("lets the crowd call the countdown in speech bubbles during a replay", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(START_MS);
    runFrame(START_MS + 900);
    runFrame(START_MS + 1700);

    const said = paintChatBubble.mock.calls.map((call) => call[1].text);
    expect(said).toEqual(expect.arrayContaining(["3", "2", "1"]));
  });

  it("paints no speech bubbles in the preview", () => {
    render(
      <RaceCanvas
        mode="start"
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(START_MS);
    runFrame(START_MS + 900);

    expect(paintChatBubble).not.toHaveBeenCalled();
  });

  it("announces the countdown 3, 2, 1 in steps of 0.8 seconds, then go", () => {
    const onCue = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={onCue}
      />
    );
    const cues = () => onCue.mock.calls.map((call) => call[0]);

    runFrame(START_MS);
    runFrame(START_MS + 700);
    expect(cues()).toEqual([{ kind: "countdown", step: 0 }]);
    runFrame(START_MS + 900);
    runFrame(START_MS + 1700);
    expect(cues()).toEqual([
      { kind: "countdown", step: 0 },
      { kind: "countdown", step: 1 },
      { kind: "countdown", step: 2 },
    ]);
    runFrame(START_MS + 2500);
    expect(cues().at(-1)).toEqual({ kind: "go" });
  });

  it("keeps a running replay going when the reduced-motion setting flips", () => {
    let matches = false;
    const listeners: (() => void)[] = [];
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        get matches() {
          return matches;
        },
        addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
        removeEventListener: vi.fn(),
      }))
    );
    const onCue = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={onCue}
      />
    );
    runFrame(START_MS);
    runFrame(START_MS + 2500);

    act(() => {
      matches = true;
      for (const listener of listeners) listener();
    });
    for (let now = START_MS + 3000; now <= START_MS + 4000; now += 250) runFrame(now);

    const goes = onCue.mock.calls.filter(([cue]) => cue.kind === "go");
    expect(goes).toHaveLength(1);
    expect(onCue.mock.calls.filter(([cue]) => cue.kind === "countdown")).toHaveLength(3);
  });

  it("sends every cue once and in order over a whole round", () => {
    const { script, racers } = bigField(30);
    const onCue = vi.fn();
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={script}
        participants={racers}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={onCue}
      />
    );

    runToEnd(onFinish);

    const kinds = onCue.mock.calls.map((call) => call[0].kind as string);
    const ordered = kinds.filter((kind) => kind !== "lead-change");
    expect(ordered).toEqual([
      "countdown",
      "countdown",
      "countdown",
      "go",
      "sprint",
      "slow-motion",
      "slow-motion",
      "finish",
    ]);
    const slow = onCue.mock.calls.map((call) => call[0]).filter((cue) => cue.kind === "slow-motion");
    expect(slow.map((cue) => cue.isOn)).toEqual([true, false]);
    expect(kinds.lastIndexOf("finish")).toBe(kinds.length - 1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("names the new leader in a lead-change cue, only after the pack has sorted itself out", () => {
    const { script, racers } = bigField(30);
    const onCue = vi.fn();
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={script}
        participants={racers}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={onCue}
      />
    );

    runToEnd(onFinish);

    const changes = onCue.mock.calls.map((call) => call[0]).filter((cue) => cue.kind === "lead-change");
    for (const change of changes) {
      expect(script.cats.map((cat) => cat.key)).toContain(change.catKey);
    }
    expect(changes.at(-1)?.catKey ?? script.winnerKey).toBe(script.winnerKey);
  });

  it("announces the finish exactly once in every round, with the lengths between the first two", () => {
    for (const seed of [1, 2, 3, 4]) {
      cleanup();
      frames.length = 0;
      const onCue = vi.fn();
      const onFinish = vi.fn();
      const script = buildRaceScript({
        entrants: [
          { characterId: "a", tickets: 3 },
          { characterId: "b", tickets: 1 },
        ],
        winner: { characterId: "a", ticketNo: 2 },
        durationSeconds: 10,
        random: seededRandom(seed),
      });
      render(
        <RaceCanvas
          script={script}
          participants={participants(false)}
          onFinish={onFinish}
          skipSignal={0}
          onStandings={vi.fn()}
          onCue={onCue}
        />
      );
      runToEnd(onFinish);

      const finishes = onCue.mock.calls.map((call) => call[0]).filter((cue) => cue.kind === "finish");
      expect(finishes).toHaveLength(1);
      expect(finishes[0].lengthsBehind).toBeGreaterThan(0);
    }
  });

  it.each([
    ["the countdown", 100],
    ["the run", 5000],
    ["the hold after the finish", (2.4 + SCRIPT.durationSeconds + 0.3) * 1000],
  ])("finishes at once and sends no cue when skipped during %s", (_phase, elapsedMs) => {
    const onCue = vi.fn();
    const onFinish = vi.fn();
    const props = { script: SCRIPT, participants: participants(false), onFinish, onStandings: vi.fn(), onCue };
    const { rerender } = render(<RaceCanvas {...props} skipSignal={0} />);
    runFrame(START_MS);
    runFrame(START_MS + elapsedMs);
    onCue.mockClear();

    rerender(<RaceCanvas {...props} skipSignal={1} />);
    runFrame(START_MS + elapsedMs + 5000);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onCue).not.toHaveBeenCalled();
  });

  it("holds the finish photo for 2.6 seconds before it finishes", () => {
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );
    const finishMs = (2.4 + SCRIPT.durationSeconds) * 1000;

    runFrame(START_MS);
    runFrame(START_MS + finishMs + 1000);
    expect(onFinish).not.toHaveBeenCalled();
    runFrame(START_MS + finishMs + 2700);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("writes every name in its lane, a multi-ticket cat with its number", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(true)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(0);

    const labels = fillText.mock.calls.map((call) => String(call[0]));
    expect(labels).toEqual(expect.arrayContaining(["Alice #1", "Alice #2", "Alice #3", "Bob"]));
  });

  it("puts every cat on the same start line at the start", () => {
    const { script, racers } = bigField(12);
    render(
      <RaceCanvas script={script} participants={racers} onFinish={vi.fn()} skipSignal={0} onStandings={vi.fn()} onCue={vi.fn()} />
    );

    runFrame(0);

    const cats = sprites.filter((sprite) => sprite.x > 0);
    expect(cats).toHaveLength(12);
    expect(new Set(cats.map((sprite) => sprite.x)).size).toBe(1);
    expect(new Set(cats.map((sprite) => sprite.y)).size).toBe(12);
  });

  it("paints the cats on the start line as a preview, with no countdown and no callbacks", () => {
    const { script, racers } = bigField(12);
    const onFinish = vi.fn();
    const onStandings = vi.fn();
    const onCue = vi.fn();
    render(
      <RaceCanvas
        mode="start"
        script={script}
        participants={racers}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={onStandings}
        onCue={onCue}
      />
    );

    runFrame(0);

    const cats = sprites.filter((sprite) => sprite.x > 0);
    expect(cats).toHaveLength(12);
    expect(new Set(cats.map((sprite) => sprite.x)).size).toBe(1);
    expect(fillText).not.toHaveBeenCalledWith("3", expect.anything(), expect.anything());
    expect(onFinish).not.toHaveBeenCalled();
    expect(onStandings).not.toHaveBeenCalled();
    expect(onCue).not.toHaveBeenCalled();
  });

  it("paints the finished race behind the winner card, cats spread out and no callbacks", () => {
    const { script, racers } = bigField(12);
    const onFinish = vi.fn();
    const onStandings = vi.fn();
    const onCue = vi.fn();
    render(
      <RaceCanvas
        mode="finish"
        script={script}
        participants={racers}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={onStandings}
        onCue={onCue}
      />
    );

    runFrame(0);

    const cats = sprites.filter((sprite) => sprite.x > 0);
    expect(cats).toHaveLength(12);
    expect(new Set(cats.map((sprite) => sprite.x)).size).toBeGreaterThan(1);
    expect(onFinish).not.toHaveBeenCalled();
    expect(onStandings).not.toHaveBeenCalled();
    expect(onCue).not.toHaveBeenCalled();
  });

  it("keeps animating the idle stage until unmounted, still with no callbacks", () => {
    const onFinish = vi.fn();
    const onCue = vi.fn();
    const { unmount } = render(
      <RaceCanvas
        mode="start"
        script={SCRIPT}
        participants={participants(false)}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={onCue}
      />
    );

    for (let now = 0; now < 5000; now += 16) runFrame(now);

    expect(frames).toHaveLength(1);
    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(onCue).not.toHaveBeenCalled();
  });

  it("paints the idle stage once under reduced motion", () => {
    stubReducedMotion(true);
    render(
      <RaceCanvas
        mode="start"
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(0);

    expect(frames).toHaveLength(0);
  });

  it("trots the cats to their new lanes on a shuffle, without rebuilding the stage", () => {
    vi.spyOn(performance, "now").mockReturnValue(START_MS);
    const { script, racers } = bigField(4);
    const keys = script.cats.map((cat) => cat.key);
    const layout = laneLayout(4, { width: 800, height: 400 });
    const { rerender } = render(shuffleCanvas(script, racers, null));
    runFrame(START_MS);
    const drawn = vi.mocked(renderBackdrop).mock.calls.length;
    const lanesBefore = nameYs();

    rerender(shuffleCanvas(script, racers, [keys[1], keys[2], keys[3], keys[0]]));
    fillText.mockClear();
    runFrame(START_MS + LANE_SHUFFLE_MS / 2);
    const halfway = nameYs().get("Người 0")!;
    fillText.mockClear();
    runFrame(START_MS + LANE_SHUFFLE_MS);

    expect(vi.mocked(renderBackdrop)).toHaveBeenCalledTimes(drawn);
    expect(lanesBefore.get("Người 0")).toBe(laneCenterY(0, layout));
    expect(halfway).toBeGreaterThan(laneCenterY(0, layout));
    expect(halfway).toBeLessThan(laneCenterY(3, layout));
    expect(nameYs().get("Người 0")).toBe(laneCenterY(3, layout));
    expect(nameYs().get("Người 1")).toBe(laneCenterY(0, layout));
  });

  it("moves the cats to their new lanes at once under reduced motion", () => {
    stubReducedMotion(true);
    const { script, racers } = bigField(4);
    const keys = script.cats.map((cat) => cat.key);
    const layout = laneLayout(4, { width: 800, height: 400 });
    const { rerender } = render(shuffleCanvas(script, racers, null));
    runFrame(START_MS);

    rerender(shuffleCanvas(script, racers, [keys[1], keys[2], keys[3], keys[0]]));
    fillText.mockClear();
    runFrame(START_MS + 16);

    expect(nameYs().get("Người 0")).toBe(laneCenterY(3, layout));
    expect(nameYs().get("Người 1")).toBe(laneCenterY(0, layout));
    expect(frames).toHaveLength(0);
  });

  it("draws the start line from the sky band down to the bottom of the track", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(0);

    const layout = laneLayout(SCRIPT.cats.length, { width: 800, height: 400 });
    expect(rects).toContainEqual([markX(0, layout) - 1, layout.band, 3, 400 - layout.band]);
  });

  it("paints only the lanes in view for 240 cats, so the bitmap stays small", () => {
    const { script, racers } = bigField(240);
    render(
      <RaceCanvas script={script} participants={racers} onFinish={vi.fn()} skipSignal={0} onStandings={vi.fn()} onCue={vi.fn()} />
    );

    runFrame(0);

    const names = fillText.mock.calls.map((call) => String(call[0])).filter((text) => text.startsWith("Ngư"));
    // 400px under a 94px band is room for 14 lanes of 22px, the last one cut off.
    expect(names).toHaveLength(14);
  });

  it("reports every cat in order and ends on the winner first", () => {
    const { script, racers } = bigField(30);
    const onFinish = vi.fn();
    const onStandings = vi.fn();
    render(
      <RaceCanvas script={script} participants={racers} onFinish={onFinish} skipSignal={0} onStandings={onStandings} onCue={vi.fn()} />
    );

    runToEnd(onFinish);

    expect(onFinish).toHaveBeenCalledTimes(1);
    const last = onStandings.mock.calls.at(-1)![0] as RaceStanding[];
    expect(last).toHaveLength(30);
    expect(last[0]).toEqual({ key: script.winnerKey, lengthsBehind: 0 });
    expect(last.map((row) => row.key)).toEqual(rankAt(script, 1));
    // The gap is in cat bodies of this canvas, so each row behind the leader carries one.
    expect(last.slice(1).every((row) => (row.lengthsBehind ?? 0) > 0)).toBe(true);
  });

  it("shows the fps counter and logs the average with ?fps", () => {
    window.history.replaceState(null, "", "/?fps");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runToEnd(onFinish);

    expect(info).toHaveBeenCalledWith(expect.stringContaining("[cat-race]"));
    info.mockRestore();
  });

  it("finishes once when skipped, with the final order, and not again at the end", () => {
    const onFinish = vi.fn();
    const onStandings = vi.fn();
    const props = {
      script: SCRIPT,
      participants: participants(false),
      onFinish,
      onStandings,
      onCue: vi.fn(),
    };
    const { rerender } = render(<RaceCanvas {...props} skipSignal={0} />);

    rerender(<RaceCanvas {...props} skipSignal={1} />);
    rerender(<RaceCanvas {...props} skipSignal={2} />);

    expect(onFinish).toHaveBeenCalledTimes(1);
    const reported = onStandings.mock.calls.at(-1)![0] as RaceStanding[];
    expect(reported.map((row) => row.key)).toEqual(rankAt(SCRIPT, 1));
  });

  it("does nothing when the canvas has no 2D context", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    expect(frames).toHaveLength(0);
  });

  it("stops observing on unmount", () => {
    const { unmount } = render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    unmount();

    expect(resizeObservers[0]?.disconnect).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("paints the same scene whatever the theme class says", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const paintedFills = (isDark: boolean) => {
      cleanup();
      fills.length = 0;
      document.documentElement.classList.toggle("dark", isDark);
      render(
        <RaceCanvas
          script={SCRIPT}
          participants={participants(false)}
          onFinish={vi.fn()}
          skipSignal={0}
          onStandings={vi.fn()}
          onCue={vi.fn()}
        />
      );
      runFrame(0);

      return [...fills];
    };

    const light = paintedFills(false);
    const dark = paintedFills(true);
    document.documentElement.classList.remove("dark");

    expect(dark).toEqual(light);
    expect(light).toEqual(expect.arrayContaining([STAGE_PALETTE.wood, STAGE_PALETTE.earth, STAGE_PALETTE.gold]));
    vi.restoreAllMocks();
  });

  it("shows a place number per lane only once the cats are running", () => {
    const { script, racers } = bigField(12);
    const placesPainted = () =>
      fillText.mock.calls.map((call) => String(call[0])).filter((text) => /^\d+$/.test(text));
    const onFinish = vi.fn();
    render(
      <RaceCanvas script={script} participants={racers} onFinish={onFinish} skipSignal={0} onStandings={vi.fn()} onCue={vi.fn()} />
    );

    runFrame(START_MS);
    runFrame(START_MS + 1000);
    expect(placesPainted()).toEqual([]);

    runFrame(START_MS + 3000);
    expect(placesPainted().sort((a, b) => Number(a) - Number(b))).toEqual(
      Array.from({ length: 12 }, (_, index) => String(index + 1)).sort((a, b) => Number(a) - Number(b))
    );
  });

  it("crowns only the leader, and only once the cats are running", () => {
    const { script, racers } = bigField(12);
    const crownPixels = () => fills.filter((fill) => fill === "#f2c14e").length;
    const onFinish = vi.fn();
    render(
      <RaceCanvas script={script} participants={racers} onFinish={onFinish} skipSignal={0} onStandings={vi.fn()} onCue={vi.fn()} />
    );

    runFrame(START_MS);
    runFrame(START_MS + 1000);
    expect(crownPixels()).toBe(0);

    fills.length = 0;
    runFrame(START_MS + 3000);
    expect(crownPixels()).toBe(1);
  });

  it("kicks up no dust and no crown in the preview", () => {
    const { script, racers } = bigField(12);
    render(
      <RaceCanvas mode="start" script={script} participants={racers} onFinish={vi.fn()} skipSignal={0} onStandings={vi.fn()} onCue={vi.fn()} />
    );

    runFrame(0);
    runFrame(16);

    expect(fills).not.toContain("#c9a27a");
    expect(fills).not.toContain("#f2c14e");
  });

  it("shows no place number in the preview", () => {
    const { script, racers } = bigField(12);
    render(
      <RaceCanvas mode="start" script={script} participants={racers} onFinish={vi.fn()} skipSignal={0} onStandings={vi.fn()} onCue={vi.fn()} />
    );

    runFrame(0);

    expect(fillText.mock.calls.map((call) => String(call[0])).filter((text) => /^\d+$/.test(text))).toEqual([]);
  });

  it("writes the plaque and the finish gate in the stage font, with the field size", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );

    runFrame(0);

    const texts = fillText.mock.calls.map((call) => String(call[0]));
    expect(texts).toEqual(expect.arrayContaining(["ĐÍCH", "ĐUA MÈO", "4 mèo · 2 người"]));
    expect(fonts).toContainEqual(expect.stringContaining("'Bungee'"));
  });

  it("draws the sky once per size, not once per frame", () => {
    const backdrops: number[] = [];
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") backdrops.push(backdrops.length);

      return original(tag);
    });
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
        onCue={vi.fn()}
      />
    );
    const afterMount = backdrops.length;

    runFrame(START_MS);
    runFrame(START_MS + 500);
    runFrame(START_MS + 1000);

    expect(backdrops).toHaveLength(afterMount);
    vi.restoreAllMocks();
  });
});
