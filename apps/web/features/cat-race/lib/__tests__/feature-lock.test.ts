import { describe, expect, it } from "vitest";

import { featureLockReason } from "../feature-lock";

const round = (voidedAt: string | null) => ({ voidedAt }) as never;

describe("featureLockReason", () => {
  it("locks an event that has not ended, before looking at its rounds", () => {
    expect(featureLockReason({ status: "OPEN", rounds: [round(null)] })).toBe("not-ended");
  });

  it("locks an ended event with no round at all", () => {
    expect(featureLockReason({ status: "ENDED", rounds: [] })).toBe("no-round");
  });

  it("locks an ended event whose every round is void", () => {
    expect(
      featureLockReason({ status: "ENDED", rounds: [round("2026-10-12T02:00:00.000Z")] })
    ).toBe("no-round");
  });

  it("allows an ended event with a round still in force", () => {
    expect(
      featureLockReason({
        status: "ENDED",
        rounds: [round("2026-10-12T02:00:00.000Z"), round(null)],
      })
    ).toBeNull();
  });
});
