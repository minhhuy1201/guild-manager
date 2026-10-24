// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PRIZE_TIER_LABEL } from "@guild/shared/enums";
import type { FeaturedRace } from "@guild/shared/schemas";

import { GUILD_LEADERS } from "../lib/guild-info";

// The auth barrel behind the call to action reaches the user menu's server actions and so
// `server-only` - harmless here, since no action ever runs.
vi.mock("server-only", () => ({}));

import { LeadershipSection } from "../components/leadership-section";
import { GuildPillars } from "../components/guild-pillars";
import { JoinSteps } from "../components/join-steps";
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

  it("mỗi người là một article, kể cả bang chủ", () => {
    render(<LeadershipSection />);

    for (const leader of GUILD_LEADERS) {
      const heading = screen.getByRole("heading", {
        level: 3,
        name: leader.name,
      });
      expect(heading.closest("article")).not.toBeNull();
    }
  });

  it("chưa có ảnh thì hiện chữ viết tắt", () => {
    render(<LeadershipSection />);

    for (const leader of GUILD_LEADERS) {
      expect(screen.getByText(leader.initials)).toBeTruthy();
    }
  });
});

describe("GuildPillars", () => {
  it("mỗi trụ cột là một article", () => {
    render(<GuildPillars />);

    const region = screen.getByRole("region", { name: "Định hướng của bang" });
    const articles = within(region).getAllByRole("article");
    expect(articles).toHaveLength(3);
    for (const article of articles) {
      expect(within(article).getByRole("heading", { level: 2 })).toBeTruthy();
    }
  });
});

describe("JoinSteps", () => {
  it("danh sách bước giữ ngữ nghĩa list", () => {
    render(<JoinSteps />);

    expect(screen.getByRole("list").getAttribute("role")).toBe("list");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("LandingScreen", () => {
  it("dựng đủ năm khối", () => {
    render(<LandingScreen isSignedIn={false} featuredRaces={[]} />);

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
    render(<LandingScreen isSignedIn={false} featuredRaces={[]} />);

    expect(screen.getByText(/đăng nhập bằng Discord/i)).toBeTruthy();
  });

  describe("Bảng vàng", () => {
    const race: FeaturedRace = {
      id: "e1",
      name: "Đua mèo mùa thu",
      endedAt: "2026-10-12T03:00:00.000Z",
      participantCount: 14,
      prizes: [
        {
          name: "Tiền mặt",
          tier: "HIGH" as FeaturedRace["prizes"][number]["tier"],
          winners: [
            {
              name: "Mèo Mập",
              guildClass: "CUU_LINH" as FeaturedRace["prizes"][number]["winners"][number]["guildClass"],
            },
          ],
        },
      ],
    };

    it("danh sách rỗng thì không có khối", () => {
      render(<LandingScreen isSignedIn={false} featuredRaces={[]} />);

      expect(screen.queryByText("Bảng vàng")).toBeNull();
    });

    it("hiện tên đợt, ngày kết thúc, số người, hạng mục và người thắng", () => {
      render(<LandingScreen isSignedIn={false} featuredRaces={[race]} />);

      expect(
        screen.getByRole("heading", { level: 2, name: "Bảng vàng" })
      ).toBeTruthy();
      expect(
        screen.getByRole("heading", { level: 3, name: "Đua mèo mùa thu" })
      ).toBeTruthy();
      expect(screen.getByText("Kết thúc 12/10/2026")).toBeTruthy();
      expect(screen.getByText("14 người tham gia")).toBeTruthy();
      expect(screen.getByText("Tiền mặt")).toBeTruthy();
      expect(screen.getByText("Mèo Mập")).toBeTruthy();
      expect(screen.queryByText(/vé/i)).toBeNull();
    });

    it("giải cao đứng trước và mọi người thắng đều có mặt", () => {
      const winnerOf = (name: string) => ({
        name,
        guildClass: race.prizes[0].winners[0].guildClass,
      });
      const mixed: FeaturedRace = {
        ...race,
        prizes: [
          { name: "Giải phụ", tier: "LOW" as FeaturedRace["prizes"][number]["tier"], winners: [winnerOf("Người A")] },
          { ...race.prizes[0], winners: [winnerOf("Người B"), winnerOf("Người C")] },
        ],
      };
      render(<LandingScreen isSignedIn={false} featuredRaces={[mixed]} />);

      for (const name of ["Người A", "Người B", "Người C"]) {
        expect(screen.getByText(name)).toBeTruthy();
      }
      const order = screen
        .getAllByRole("heading", { level: 4 })
        .map((heading) => heading.textContent);
      expect(order[0]).toBe(`Giải ${PRIZE_TIER_LABEL.HIGH}`);
    });

    it("đợt mới nhất đứng trước trong thứ tự đọc", () => {
      const older = { ...race, id: "e0", name: "Đợt cũ hơn" };
      render(
        <LandingScreen isSignedIn={false} featuredRaces={[race, older]} />
      );

      const titles = screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent)
        .filter((text) => text === race.name || text === older.name);
      expect(titles).toEqual([race.name, older.name]);
    });
  });
});
