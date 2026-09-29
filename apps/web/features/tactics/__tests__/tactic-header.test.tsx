// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ROUTES } from "@/config/routes";
import { TacticHeader } from "../components/tactic-header";

afterEach(cleanup);

describe("TacticHeader", () => {
  it("leads back to the list, twice over: the arrow and the crumb", () => {
    render(<TacticHeader title="Thủ cổng tây" />);

    expect(
      screen.getByRole("link", { name: "Chiến thuật" }).getAttribute("href")
    ).toBe(ROUTES.tactics);
    expect(
      screen
        .getByRole("link", { name: "Về danh sách chiến thuật" })
        .getAttribute("href")
    ).toBe(ROUTES.tactics);
  });

  it("names the tactic in the page's one heading, outside the trail", () => {
    render(<TacticHeader title="Thủ cổng tây" />);

    const heading = screen.getByRole("heading", { level: 1 });

    expect(heading.textContent).toBe("Thủ cổng tây");
    expect(
      screen.getByRole("navigation", { name: "breadcrumb" }).contains(heading)
    ).toBe(false);
  });
});
