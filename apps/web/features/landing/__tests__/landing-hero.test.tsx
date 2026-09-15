// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GUILD_PILLARS } from "../lib/guild-info";

// The auth barrel behind the call to action reaches the user menu's server actions and so
// `server-only` - harmless here, since no action ever runs.
vi.mock("server-only", () => ({}));

import { GuildPillars } from "../components/guild-pillars";
import { LandingHero } from "../components/landing-hero";

afterEach(cleanup);

describe("LandingHero", () => {
  it("hero mang tên bang trong tiêu đề chính", () => {
    render(<LandingHero isSignedIn={false} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Mèo Mập Giang Hồ" })
    ).toBeTruthy();
  });

  it("hero có nút điểm danh", () => {
    render(<LandingHero isSignedIn />);

    expect(screen.getByRole("button", { name: "Điểm danh ngay" })).toBeTruthy();
  });
});

describe("GuildPillars", () => {
  it("ba ý định hướng, mỗi ý một tiêu đề", () => {
    render(<GuildPillars />);

    for (const pillar of GUILD_PILLARS) {
      expect(
        screen.getByRole("heading", { level: 2, name: pillar.title })
      ).toBeTruthy();
    }
  });
});
