// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PrizeTier } from "@guild/shared/enums";

import { PRIZE_TIER_CLASS, PRIZE_TIER_OPTIONS } from "../../lib/prize-tier-style";
import { PrizeTierBadge } from "../prize-tier-badge";

afterEach(cleanup);

describe("PrizeTierBadge", () => {
  it("draws a different icon and tint for every tier, hidden from screen readers", () => {
    const markup = Object.values(PrizeTier).map((tier) => {
      const { container, unmount } = render(<PrizeTierBadge tier={tier} />);
      const badge = container.firstElementChild!;
      const html = badge.innerHTML;
      expect(badge.getAttribute("aria-hidden")).toBe("true");
      unmount();

      return `${badge.className}|${html}`;
    });

    expect(new Set(markup).size).toBe(3);
  });
});

describe("prize tier style", () => {
  it("names the tiers in words and never leaves the lowest on the card surface", () => {
    expect(PRIZE_TIER_OPTIONS.map((option) => option.label)).toEqual(["Đặc biệt", "Lớn", "Thường"]);
    expect(PRIZE_TIER_CLASS[PrizeTier.LOW]).not.toContain("bg-card");
  });
});
