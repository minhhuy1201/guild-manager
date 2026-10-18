// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode, GUILD_CLASS_LABEL, PrizeTier } from "@guild/shared/enums";
import type { CatRaceDrawResult } from "@guild/shared/schemas";

const m = vi.hoisted(() => ({
  confetti: vi.fn(),
  reducedMotion: { current: false },
}));

vi.mock("canvas-confetti", () => ({ default: m.confetti }));
vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => m.reducedMotion.current,
}));
vi.mock("@/features/auth", () => ({
  discordAvatarUrl: (id: string, hash: string | null) =>
    hash ? `https://cdn.test/${id}/${hash}.png` : null,
}));

import { RaceResultOverlay } from "../race-result-overlay";
import { WinnersPanel } from "../winners-panel";
import { PRIZE, ROUND, makeEvent } from "./fixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  m.reducedMotion.current = false;
});

const VOIDED = {
  ...ROUND,
  id: "r2",
  winnerName: "Bob",
  voidedAt: "2026-10-12T02:00:00.000Z",
  voidReason: "nhầm người",
};

describe("WinnersPanel", () => {
  it("says so when a prize has no winner yet", () => {
    render(<WinnersPanel event={makeEvent()} canVoid onVoid={vi.fn()} />);

    expect(screen.getByText("Chưa có người thắng.")).toBeTruthy();
  });

  it("gives each prize its own block with the tier named and how many went out", () => {
    const event = makeEvent({
      prizes: [
        { ...PRIZE, awardedCount: 1, tier: PrizeTier.HIGH },
        { ...PRIZE, id: "p2", name: "Thẻ tháng", quantity: 5, tier: PrizeTier.LOW },
      ],
      rounds: [ROUND],
    });
    render(<WinnersPanel event={event} canVoid onVoid={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Tiền mặt" })).toBeTruthy();
    expect(screen.getByText("Đặc biệt · đã trao 1/2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Thẻ tháng" })).toBeTruthy();
    expect(screen.getByText("Thường · đã trao 0/5")).toBeTruthy();
  });

  it("shows the winner's class icon and name, and offers to void a live round", () => {
    const onVoid = vi.fn();
    render(<WinnersPanel event={makeEvent({ rounds: [ROUND] })} canVoid onVoid={onVoid} />);

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText(GUILD_CLASS_LABEL[ROUND.winnerGuildClass][0])).toBeTruthy();
    expect(screen.queryByText(/giữa/)).toBeNull();
    fireEvent.click(screen.getByLabelText("Huỷ vòng của Alice"));

    expect(onVoid).toHaveBeenCalledWith(ROUND);
  });

  it("leaves tickets out of the winner line in TICKET mode", () => {
    render(
      <WinnersPanel
        event={makeEvent({ mode: CatRaceMode.TICKET, rounds: [{ ...ROUND, winnerTickets: 2, totalTickets: 5 }] })}
        canVoid
        onVoid={vi.fn()}
      />
    );

    expect(screen.queryByText(/vé/)).toBeNull();
  });

  it("keeps a voided round with its reason and no void button", () => {
    render(<WinnersPanel event={makeEvent({ rounds: [VOIDED] })} canVoid onVoid={vi.fn()} />);

    expect(screen.getByText("Đã huỷ: nhầm người")).toBeTruthy();
    expect(screen.queryByLabelText("Huỷ vòng của Bob")).toBeNull();
  });

  it("hides every void button once voiding is off", () => {
    render(
      <WinnersPanel event={makeEvent({ rounds: [ROUND] })} canVoid={false} onVoid={vi.fn()} />
    );

    expect(screen.queryByLabelText("Huỷ vòng của Alice")).toBeNull();
  });
});

describe("RaceResultOverlay", () => {
  const RESULT: CatRaceDrawResult = {
    round: ROUND,
    entrants: [{ characterId: "a", tickets: 1 }],
    winningTicket: 1,
  };

  /**
   * Render the overlay.
   * @param props - Fields to change
   */
  function renderOverlay(
    props: Partial<React.ComponentProps<typeof RaceResultOverlay>> = {}
  ) {
    const onContinue = vi.fn();
    render(
      <RaceResultOverlay
        event={makeEvent()}
        prize={PRIZE}
        result={RESULT}
        isContinuing={false}
        onContinue={onContinue}
        {...props}
      />
    );

    return onContinue;
  }

  it("shows the winner, the prize and the pool, and fires confetti", async () => {
    const onContinue = renderOverlay();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText(/Tiền mặt/)).toBeTruthy();
    expect(screen.getByText("Thắng giữa 2 người")).toBeTruthy();
    expect(m.confetti).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Đua tiếp" }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("skips confetti for a viewer who asked for less motion", async () => {
    m.reducedMotion.current = true;
    renderOverlay();

    await act(async () => {
      await Promise.resolve();
    });

    expect(m.confetti).not.toHaveBeenCalled();
  });

  it("reports tickets in TICKET mode and survives a missing prize", () => {
    renderOverlay({
      event: makeEvent({ mode: CatRaceMode.TICKET }),
      prize: undefined,
      result: { ...RESULT, round: { ...ROUND, winnerTickets: 2, totalTickets: 5 } },
    });

    expect(screen.getByText("Thắng với 2/5 vé")).toBeTruthy();
  });

  // Base UI mounts the <img> only once the browser has loaded it, so jsdom keeps the fallback.
  it("keeps the initial as the fallback while the Discord avatar loads", () => {
    const event = makeEvent();
    event.participants[0] = { ...event.participants[0], discordId: "111", discordAvatar: "hash" };
    renderOverlay({ event });

    expect(screen.getByText("A")).toBeTruthy();
  });

  it("locks the button while the refresh runs", () => {
    renderOverlay({ isContinuing: true });

    expect((screen.getByRole("button", { name: "Đua tiếp" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
