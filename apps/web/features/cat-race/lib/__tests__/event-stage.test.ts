import { describe, expect, it } from "vitest";

import { eventStageOf } from "../event-stage";

describe("eventStageOf", () => {
  it("an open event is open", () => {
    expect(eventStageOf({ status: "OPEN", discordPostedAt: null })).toBe("open");
  });

  it("an ended event is ended until its summary reaches Discord", () => {
    expect(eventStageOf({ status: "ENDED", discordPostedAt: null })).toBe("ended");
    expect(eventStageOf({ status: "ENDED", discordPostedAt: "2026-10-10T01:00:00.000Z" })).toBe("posted");
  });
});
