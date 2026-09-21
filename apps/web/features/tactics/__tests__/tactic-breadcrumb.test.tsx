// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ROUTES } from "@/config/routes";
import { TacticBreadcrumb } from "../components/tactic-breadcrumb";

afterEach(cleanup);

describe("TacticBreadcrumb", () => {
  it("names the tactic and leads back to the list", () => {
    render(<TacticBreadcrumb name="Thủ cổng tây" />);

    expect(screen.getByText("Thủ cổng tây")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Chiến thuật" }).getAttribute("href")
    ).toBe(ROUTES.tactics);
    expect(
      screen
        .getByRole("link", { name: "Về danh sách chiến thuật" })
        .getAttribute("href")
    ).toBe(ROUTES.tactics);
  });

  it("says it is loading while the name is not in yet", () => {
    render(<TacticBreadcrumb name="" />);

    expect(screen.getByText("Đang tải...")).toBeTruthy();
  });
});
