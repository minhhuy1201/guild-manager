// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ROUTES } from "@/config/routes";
import { TacticBreadcrumb } from "../components/tactic-breadcrumb";

afterEach(cleanup);

describe("TacticBreadcrumb", () => {
  it("leads back to the list, twice over: the arrow and the crumb", () => {
    render(<TacticBreadcrumb />);

    expect(
      screen.getByRole("link", { name: "Chiến thuật" }).getAttribute("href")
    ).toBe(ROUTES.tactics);
    expect(
      screen
        .getByRole("link", { name: "Về danh sách chiến thuật" })
        .getAttribute("href")
    ).toBe(ROUTES.tactics);
  });

  // The banner's own `<h1>` carries the tactic's name; a last crumb would print it twice.
  it("stops at the parent instead of repeating the tactic's name", () => {
    render(<TacticBreadcrumb />);

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
