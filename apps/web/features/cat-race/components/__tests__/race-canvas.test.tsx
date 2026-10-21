// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { CatRaceParticipant } from "@guild/shared/schemas";

vi.mock("@/features/auth", () => ({
  discordAvatarUrl: (id: string, hash: string | null) =>
    hash ? `https://cdn.test/${id}/${hash}.png` : null,
}));

import { buildRaceScript, rankAt } from "../../lib/race-script";
import { RaceCanvas } from "../race-canvas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A 2D context that accepts every call; text, colours, rectangles and sprites are recorded to read what got painted. */
const fillText = vi.fn();
const fills: unknown[] = [];
const rects: [number, number, number, number][] = [];
const sprites: { x: number; y: number }[] = [];
const fakeContext = new Proxy(
  {},
  {
    get: (_target, property) => {
      if (property === "fillText") return fillText;
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

      return true;
    },
  }
);

/** A real frame timestamp is never 0, which the canvas reads as 'not started yet'. */
const START_MS = 1000;
const frames: FrameRequestCallback[] = [];
const resizeObservers: { disconnect: ReturnType<typeof vi.fn> }[] = [];

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
  rects.length = 0;
  sprites.length = 0;
  frames.length = 0;
  resizeObservers.length = 0;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => frames.push(callback))
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
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
  vi.unstubAllGlobals();
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

describe("RaceCanvas", () => {
  it("counts down before the cats leave", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
      />
    );

    runFrame(0);

    expect(fillText).toHaveBeenCalledWith("3", 400, 200);
  });

  it("lights the countdown 3, 2, 1 in steps of 0.8 seconds, then leaves the cats to run", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
      />
    );
    const digits = () => fillText.mock.calls.map((call) => String(call[0])).filter((text) => /^[123]$/.test(text));

    runFrame(START_MS);
    expect(digits()).toEqual(["3"]);
    fillText.mockClear();
    runFrame(START_MS + 700);
    expect(digits()).toEqual(["3"]);
    fillText.mockClear();
    runFrame(START_MS + 900);
    expect(digits()).toEqual(["2"]);
    fillText.mockClear();
    runFrame(START_MS + 1700);
    expect(digits()).toEqual(["1"]);
    fillText.mockClear();
    runFrame(START_MS + 2500);
    expect(digits()).toEqual([]);
  });

  it("keeps the finished race on screen for the hold before it finishes", () => {
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
      />
    );
    const finishMs = (2.4 + SCRIPT.durationSeconds) * 1000;

    runFrame(START_MS);
    runFrame(START_MS + finishMs + 100);
    expect(onFinish).not.toHaveBeenCalled();
    runFrame(START_MS + finishMs + 1000);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("holds longer on a photo finish", () => {
    const photo = buildRaceScript({
      entrants: [
        { characterId: "a", tickets: 3 },
        { characterId: "b", tickets: 1 },
      ],
      winner: { characterId: "a", ticketNo: 2 },
      durationSeconds: 10,
      scenario: "photo",
      random: () => 0.5,
    });
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={photo}
        participants={participants(false)}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={vi.fn()}
      />
    );
    const finishMs = (2.4 + photo.durationSeconds) * 1000;

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
      />
    );

    runFrame(0);

    const labels = fillText.mock.calls.map((call) => String(call[0]));
    expect(labels).toEqual(expect.arrayContaining(["Alice #1", "Alice #2", "Alice #3", "Bob"]));
  });

  it("puts every cat on the same start line at the start", () => {
    const { script, racers } = bigField(12);
    render(
      <RaceCanvas script={script} participants={racers} onFinish={vi.fn()} skipSignal={0} onStandings={vi.fn()} />
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
    render(
      <RaceCanvas
        isPreview
        script={script}
        participants={racers}
        onFinish={onFinish}
        skipSignal={0}
        onStandings={onStandings}
      />
    );

    runFrame(0);

    const cats = sprites.filter((sprite) => sprite.x > 0);
    expect(cats).toHaveLength(12);
    expect(new Set(cats.map((sprite) => sprite.x)).size).toBe(1);
    expect(frames).toHaveLength(0);
    expect(fillText).not.toHaveBeenCalledWith("3", expect.anything(), expect.anything());
    expect(onFinish).not.toHaveBeenCalled();
    expect(onStandings).not.toHaveBeenCalled();
  });

  it("draws the start line the full height of the track", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
      />
    );

    runFrame(0);

    // 800px wide: the name column is 22% = 176px, and the line is centred on it.
    expect(rects).toContainEqual([174.5, 0, 3, 400]);
  });

  it("paints only the lanes in view for 240 cats, so the bitmap stays small", () => {
    const { script, racers } = bigField(240);
    render(
      <RaceCanvas script={script} participants={racers} onFinish={vi.fn()} skipSignal={0} onStandings={vi.fn()} />
    );

    runFrame(0);

    const names = fillText.mock.calls.map((call) => String(call[0])).filter((text) => text.startsWith("Ngư"));
    // 400px of 22px lanes.
    expect(names.length).toBeGreaterThanOrEqual(18);
    expect(names.length).toBeLessThanOrEqual(20);
  });

  it("reports every cat in order and ends on the winner first", () => {
    const { script, racers } = bigField(30);
    const onFinish = vi.fn();
    const onStandings = vi.fn();
    render(
      <RaceCanvas script={script} participants={racers} onFinish={onFinish} skipSignal={0} onStandings={onStandings} />
    );

    runToEnd(onFinish);

    expect(onFinish).toHaveBeenCalledTimes(1);
    const last = onStandings.mock.calls.at(-1)![0] as string[];
    expect(last).toHaveLength(30);
    expect(last[0]).toBe(script.winnerKey);
    expect(last).toEqual(rankAt(script, 1));
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
    };
    const { rerender } = render(<RaceCanvas {...props} skipSignal={0} />);

    rerender(<RaceCanvas {...props} skipSignal={1} />);
    rerender(<RaceCanvas {...props} skipSignal={2} />);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onStandings).toHaveBeenCalledWith(rankAt(SCRIPT, 1));
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
      />
    );

    unmount();

    expect(resizeObservers[0]?.disconnect).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("re-reads the palette when the theme class changes", async () => {
    vi.spyOn(window, "getComputedStyle").mockImplementation(
      () =>
        ({
          fontFamily: "sans-serif",
          getPropertyValue: (name: string) =>
            name === "--foreground"
              ? document.documentElement.classList.contains("dark")
                ? "dark-fg"
                : "light-fg"
              : "",
        }) as CSSStyleDeclaration
    );
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onStandings={vi.fn()}
      />
    );
    runFrame(0);
    expect(fills).toContain("light-fg");

    fills.length = 0;
    document.documentElement.classList.add("dark");
    await Promise.resolve();
    runFrame(500);

    expect(fills).toContain("dark-fg");
    expect(fills).not.toContain("light-fg");
    document.documentElement.classList.remove("dark");
    vi.restoreAllMocks();
  });
});
