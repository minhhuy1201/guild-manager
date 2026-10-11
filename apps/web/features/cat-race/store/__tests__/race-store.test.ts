import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("race store speed", () => {
  it("falls back to NORMAL when localStorage throws", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const { useRaceStore } = await import("../race-store");

    expect(useRaceStore.getState().speed).toBe("NORMAL");
    expect(() => useRaceStore.getState().setSpeed("FAST")).not.toThrow();
    expect(useRaceStore.getState().speed).toBe("FAST");
  });

  it("reads a saved speed and ignores junk", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "SLOW", setItem: () => {} });
    const saved = await import("../race-store");
    expect(saved.useRaceStore.getState().speed).toBe("SLOW");

    vi.resetModules();
    vi.stubGlobal("localStorage", { getItem: () => "TURBO", setItem: () => {} });
    const junk = await import("../race-store");
    expect(junk.useRaceStore.getState().speed).toBe("NORMAL");
  });

  it("walks a round through its stages and back", async () => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
    const { useRaceStore } = await import("../race-store");
    const result = { winningTicket: 1 } as never;

    useRaceStore.getState().startDrawing();
    expect(useRaceStore.getState().stage).toBe("drawing");
    useRaceStore.getState().startRacing(result);
    expect(useRaceStore.getState().stage).toBe("racing");
    useRaceStore.getState().showResult(result);
    expect(useRaceStore.getState().stage).toBe("result");
    useRaceStore.getState().reset();
    expect(useRaceStore.getState().stage).toBe("idle");
    expect(useRaceStore.getState().pendingResult).toBeNull();
  });
});
