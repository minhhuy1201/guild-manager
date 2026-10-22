// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RaceStatusBadge } from "../race-status-badge";

describe("RaceStatusBadge", () => {
  afterEach(cleanup);

  it("names the stage in words", () => {
    render(<RaceStatusBadge stage="ended" />);

    expect(screen.getByText("Đã kết thúc")).toBeTruthy();
  });
});
