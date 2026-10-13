import { describe, expect, it } from "vitest";

import { prizeLockReason } from "../prize-lock";

const OPEN_PRIZE = { quantity: 2, awardedCount: 1, entrantIds: ["a", "b"] };

describe("prizeLockReason", () => {
  it("is free when the event is open, the prize has room and two can race", () => {
    expect(prizeLockReason(OPEN_PRIZE, "OPEN")).toBeNull();
  });

  it("locks everything once the event ended", () => {
    expect(prizeLockReason(OPEN_PRIZE, "ENDED")).toBe("ended");
  });

  it("locks a prize that has given out all its quantity", () => {
    expect(prizeLockReason({ ...OPEN_PRIZE, awardedCount: 2 }, "OPEN")).toBe("full");
  });

  it("locks a prize with fewer than two entrants", () => {
    expect(prizeLockReason({ ...OPEN_PRIZE, entrantIds: ["a"] }, "OPEN")).toBe(
      "too-few"
    );
  });
});
