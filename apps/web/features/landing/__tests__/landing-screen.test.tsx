// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GUILD_LEADERS } from "../lib/guild-info";

// The auth barrel behind the call to action reaches the user menu's server actions and so
// `server-only` - harmless here, since no action ever runs.
vi.mock("server-only", () => ({}));

import { LeadershipSection } from "../components/leadership-section";
import { LandingScreen } from "../components/landing-screen";

afterEach(cleanup);

describe("LeadershipSection", () => {
  it("hiện đủ bốn người kèm vai trò", () => {
    render(<LeadershipSection />);

    for (const leader of GUILD_LEADERS) {
      expect(
        screen.getByRole("heading", { level: 3, name: leader.name })
      ).toBeTruthy();
    }

    expect(screen.getByText("Bang chủ")).toBeTruthy();
    expect(screen.getByText("Leader")).toBeTruthy();
    expect(screen.getAllByText("Quản lý")).toHaveLength(2);
  });

  it("chưa có ảnh thì hiện chữ viết tắt", () => {
    render(<LeadershipSection />);

    for (const leader of GUILD_LEADERS) {
      expect(screen.getByText(leader.initials)).toBeTruthy();
    }
  });
});

describe("LandingScreen", () => {
  it("dựng đủ năm khối", () => {
    render(<LandingScreen isSignedIn={false} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Mèo Mập Giang Hồ" })
    ).toBeTruthy();

    for (const title of [
      "Bang hard PVP",
      "Ban chỉ huy",
      "Vào bang thế nào",
      "Tuần này bang đánh, bạn có đi không",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: title })
      ).toBeTruthy();
    }
  });

  it("khối cuối nói rõ cần đăng nhập Discord", () => {
    render(<LandingScreen isSignedIn={false} />);

    expect(screen.getByText(/đăng nhập bằng Discord/i)).toBeTruthy();
  });
});
