// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const dynamicCalls: unknown[] = [];

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>, options: unknown) => {
    dynamicCalls.push(options);

    return loader;
  },
}));

const { TacticCanvas } = await import("../components/tactic-canvas");
const { TacticStageView } = await import("../components/tactic-stage-view");

describe("TacticCanvas", () => {
  it("keeps Konva off the server, where there is no window to reach for", () => {
    expect(dynamicCalls).toEqual([{ ssr: false }]);
  });

  it("loads the real stage view, not some other export of that module", async () => {
    const loaded = await (TacticCanvas as unknown as () => Promise<unknown>)();

    expect(loaded).toBe(TacticStageView);
  });
});
