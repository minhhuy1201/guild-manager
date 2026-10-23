// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PrizeTier } from "@guild/shared/enums";

vi.mock("@/features/auth", () => ({
  discordAvatarUrl: (id: string, hash: string | null) =>
    hash ? `https://cdn.test/${id}/${hash}.png` : null,
}));

import { TooltipProvider } from "@/components/ui/tooltip";
import { CatRaceResults } from "../cat-race-results";
import { PRIZE, ROUND, makeEvent } from "./fixtures";

afterEach(cleanup);

const mid = { ...PRIZE, id: "p2", name: "Vé", tier: PrizeTier.MEDIUM, sortOrder: 1, quantity: 1 };

function renderResults(overrides: Parameters<typeof makeEvent>[0] = {}) {
  return render(
    <TooltipProvider>
      <CatRaceResults event={makeEvent({ status: "ENDED", ...overrides })} />
    </TooltipProvider>
  );
}

describe("CatRaceResults", () => {
  it("summarises people, awarded prizes and voided rounds", () => {
    renderResults({
      awardedCount: 1,
      prizes: [{ ...PRIZE, awardedCount: 1 }, mid],
      rounds: [
        ROUND,
        { ...ROUND, id: "r2", prizeId: "p1", winnerName: "Bob", voidedAt: "2026-10-12T01:10:00.000Z", voidReason: "Vắng mặt" },
      ],
    });

    const summary = screen.getByRole("list", { name: "Tổng kết đợt đua" });
    expect(within(summary).getByText("2 người tham gia")).toBeTruthy();
    expect(within(summary).getByText("1/3 giải đã trao")).toBeTruthy();
    expect(within(summary).getByText("1 vòng huỷ")).toBeTruthy();
  });

  it("omits the voided count when nothing was voided", () => {
    renderResults({ rounds: [ROUND] });

    expect(screen.queryByText(/vòng huỷ/)).toBeNull();
  });

  it("lists a prize with its winner, most valuable tier first", () => {
    renderResults({
      prizes: [mid, { ...PRIZE, awardedCount: 1 }],
      rounds: [ROUND, { ...ROUND, id: "r3", prizeId: "p2", winnerName: "Carol" }],
    });

    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Tiền mặt", "Vé"]);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Carol")).toBeTruthy();
  });

  it("strikes a voided round through and states the reason in words", () => {
    renderResults({
      rounds: [{ ...ROUND, voidedAt: "2026-10-12T01:10:00.000Z", voidReason: "Vắng mặt" }],
    });

    expect(screen.getByText("Alice").className).toContain("line-through");
    expect(screen.getByText("Đã huỷ: Vắng mặt")).toBeTruthy();
  });

  it("says so when a prize was never awarded", () => {
    renderResults({ rounds: [] });

    expect(screen.getByText("Không trao giải nào.")).toBeTruthy();
  });

  it("offers no race controls", () => {
    renderResults({ rounds: [ROUND] });

    expect(screen.queryByRole("button")).toBeNull();
  });
});
