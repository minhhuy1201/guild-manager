import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("race store duration", () => {
  it("falls back to the default when localStorage throws", async () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    const { useRaceStore } = await import("../race-store");

    expect(useRaceStore.getState().durationSeconds).toBe(12);
    expect(() => useRaceStore.getState().setDurationSeconds(30)).not.toThrow();
    expect(useRaceStore.getState().durationSeconds).toBe(30);
  });

  it("reads a saved duration and ignores junk, out-of-range numbers and the old speed", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "25", setItem: () => {} });
    const saved = await import("../race-store");
    expect(saved.useRaceStore.getState().durationSeconds).toBe(25);

    for (const stored of ["TURBO", "FAST", "9", "41", "12.5", null]) {
      vi.resetModules();
      vi.stubGlobal("localStorage", { getItem: () => stored, setItem: () => {} });
      const other = await import("../race-store");
      expect(other.useRaceStore.getState().durationSeconds).toBe(12);
    }
  });

  it("saves the chosen duration under its own key", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem: () => null, setItem });
    const { useRaceStore } = await import("../race-store");

    useRaceStore.getState().setDurationSeconds(18);

    expect(setItem).toHaveBeenCalledWith("cat-race-duration-seconds", "18");
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
