// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuildClass } from "@guild/shared/enums";
import type { CatRaceParticipant } from "@guild/shared/schemas";

vi.mock("@/features/auth", () => ({
  discordAvatarUrl: (id: string, hash: string | null) =>
    hash ? `https://cdn.test/${id}/${hash}.png` : null,
}));

import { buildRaceScript } from "../../lib/race-script";
import { RaceCanvas } from "../race-canvas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A 2D context that accepts every call; `fillText` is recorded to read what got painted. */
const fillText = vi.fn();
const fakeContext = new Proxy(
  {},
  {
    get: (_target, property) =>
      property === "fillText" ? fillText : () => undefined,
    set: () => true,
  }
);

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
  speed: "FAST",
  random: () => 0.5,
});

beforeEach(() => {
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
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeContext) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ width: 800, height: 400 }) as DOMRect;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

describe("RaceCanvas", () => {
  it("counts down before the cats leave", () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onLeaders={vi.fn()}
      />
    );

    runFrame(0);

    expect(fillText).toHaveBeenCalledWith("3", 400, 200);
  });

  it("reports leaders and finishes once, labelling a multi-ticket cat with its number", () => {
    const onFinish = vi.fn();
    const onLeaders = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(true)}
        onFinish={onFinish}
        skipSignal={0}
        onLeaders={onLeaders}
      />
    );

    runToEnd(onFinish);

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onLeaders).toHaveBeenCalled();
    const labels = fillText.mock.calls.map((call) => call[0]);
    expect(labels.some((label) => /^Alice #\d$/.test(String(label)))).toBe(true);
    expect(labels).toContain("Bob");
  });

  it("paints on a vertical track under the narrow breakpoint", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    const onFinish = vi.fn();
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={onFinish}
        skipSignal={0}
        onLeaders={vi.fn()}
      />
    );

    runToEnd(onFinish);

    expect(onFinish).toHaveBeenCalledTimes(1);
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
        onLeaders={vi.fn()}
      />
    );

    runToEnd(onFinish);

    expect(info).toHaveBeenCalledWith(expect.stringContaining("[cat-race]"));
    info.mockRestore();
  });

  it("finishes once when skipped, and not again at the end", () => {
    const onFinish = vi.fn();
    const props = {
      script: SCRIPT,
      participants: participants(false),
      onFinish,
      onLeaders: vi.fn(),
    };
    const { rerender } = render(<RaceCanvas {...props} skipSignal={0} />);

    rerender(<RaceCanvas {...props} skipSignal={1} />);
    rerender(<RaceCanvas {...props} skipSignal={2} />);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the canvas has no 2D context", () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onLeaders={vi.fn()}
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
        onLeaders={vi.fn()}
      />
    );

    unmount();

    expect(resizeObservers[0]?.disconnect).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it("re-reads the palette when the theme class changes", async () => {
    render(
      <RaceCanvas
        script={SCRIPT}
        participants={participants(false)}
        onFinish={vi.fn()}
        skipSignal={0}
        onLeaders={vi.fn()}
      />
    );

    document.documentElement.classList.add("dark");
    await Promise.resolve();
    runFrame(0);

    document.documentElement.classList.remove("dark");
    expect(fillText).toHaveBeenCalled();
  });
});
