// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RaceStatusBadge, raceStageOf } from "../race-status-badge";

describe("raceStageOf", () => {
  it("an open event is open whether or not it was posted", () => {
    expect(raceStageOf({ status: "OPEN", discordPostedAt: null })).toBe("open");
  });

  it("an ended event is ended until its summary reaches Discord", () => {
    expect(raceStageOf({ status: "ENDED", discordPostedAt: null })).toBe("ended");
    expect(raceStageOf({ status: "ENDED", discordPostedAt: "2026-10-10T01:00:00.000Z" })).toBe("posted");
  });
});

describe("RaceStatusBadge", () => {
  afterEach(cleanup);

  it("names the stage in words", () => {
    render(<RaceStatusBadge stage="ended" />);

    expect(screen.getByText("Đã kết thúc")).toBeTruthy();
  });
});
