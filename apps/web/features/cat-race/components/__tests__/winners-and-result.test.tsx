// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode } from "@guild/shared/enums";
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

  it("lists the pool size in STANDARD mode and offers to void a live round", () => {
    const onVoid = vi.fn();
    render(<WinnersPanel event={makeEvent({ rounds: [ROUND] })} canVoid onVoid={onVoid} />);

    expect(screen.getByText(/giữa 2 người/)).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Huỷ vòng của Alice"));

    expect(onVoid).toHaveBeenCalledWith(ROUND);
  });

  it("lists the tickets in TICKET mode", () => {
    render(
      <WinnersPanel
        event={makeEvent({ mode: CatRaceMode.TICKET, rounds: [{ ...ROUND, winnerTickets: 2, totalTickets: 5 }] })}
        canVoid
        onVoid={vi.fn()}
      />
    );

    expect(screen.getByText(/2\/5 vé/)).toBeTruthy();
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

  // Radix mounts the <img> only once the browser has loaded it, so jsdom keeps the fallback.
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
