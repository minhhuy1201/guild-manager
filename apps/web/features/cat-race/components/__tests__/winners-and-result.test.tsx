// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import { buildRaceScript } from "../../lib/race-script";
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

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * A finished race of the given entrants, the first of them winning.
   * @param entrants - Who ran
   * @returns The script
   */
  function scriptOf(entrants: { characterId: string; tickets: number }[]) {
    return buildRaceScript({
      entrants,
      winner: { characterId: entrants[0].characterId, ticketNo: 1 },
      durationSeconds: 10,
      random: () => 0.5,
    });
  }

  /**
   * Render the overlay and let the confetti import settle.
   * @param props - Fields to change
   */
  async function renderOverlay(
    props: Partial<React.ComponentProps<typeof RaceResultOverlay>> = {}
  ) {
    const onContinue = vi.fn();
    render(
      <RaceResultOverlay
        event={makeEvent()}
        prize={PRIZE}
        result={RESULT}
        script={null}
        isContinuing={false}
        onContinue={onContinue}
        {...props}
      />
    );
    await act(async () => {
      await Promise.resolve();
    });

    return onContinue;
  }

  it("shows the tier line, the winner and the odds, and continues on click", async () => {
    const onContinue = await renderOverlay();

    expect(screen.getByText("GIẢI ĐẶC BIỆT · Tiền mặt")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText(GUILD_CLASS_LABEL[ROUND.winnerGuildClass])).toBeTruthy();
    expect(screen.getByText("Thắng giữa 2 người · tỉ lệ 50%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Đua tiếp" }));
    expect(onContinue).toHaveBeenCalled();
  });

  it("fires the top tier's centre burst now and its side cannons later", async () => {
    await renderOverlay();

    expect(m.confetti).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(m.confetti).toHaveBeenCalledTimes(3);
  });

  it("fires a single smaller burst for the low tier", async () => {
    await renderOverlay({ prize: { ...PRIZE, tier: PrizeTier.LOW } });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(m.confetti).toHaveBeenCalledTimes(1);
    expect(m.confetti.mock.calls[0][0].particleCount).toBe(70);
  });

  it("cancels the side cannons when the card goes away", async () => {
    await renderOverlay();
    cleanup();
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(m.confetti).toHaveBeenCalledTimes(1);
  });

  it("skips confetti for a viewer who asked for less motion", async () => {
    m.reducedMotion.current = true;
    await renderOverlay();
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(m.confetti).not.toHaveBeenCalled();
  });

  it("reports tickets and the cat number in TICKET mode, and survives a missing prize", async () => {
    await renderOverlay({
      event: makeEvent({ mode: CatRaceMode.TICKET }),
      prize: undefined,
      result: {
        ...RESULT,
        winningTicket: 2,
        round: { ...ROUND, winnerTickets: 2, totalTickets: 5 },
      },
    });

    expect(screen.getByText("Thắng với 2/5 vé · tỉ lệ 40%")).toBeTruthy();
    expect(screen.getByText(/mèo #2/)).toBeTruthy();
  });

  it("stamps a long shot and leaves the stamp off an even one", async () => {
    const event = makeEvent({
      mode: CatRaceMode.TICKET,
      participants: ["a", "b", "c"].map((id) => ({
        ...makeEvent().participants[0],
        characterId: id,
        name: id,
      })),
    });
    await renderOverlay({
      event,
      result: { ...RESULT, round: { ...ROUND, winnerTickets: 1, totalTickets: 6, entrantCount: 3 } },
    });

    expect(screen.getByText("KÈO DƯỚI")).toBeTruthy();
    cleanup();
    await renderOverlay();

    expect(screen.queryByText("KÈO DƯỚI")).toBeNull();
  });

  it("lists places two and three of the finished race, and nothing when there is no script", async () => {
    const entrants = [
      { characterId: "a", tickets: 1 },
      { characterId: "b", tickets: 1 },
      { characterId: "c", tickets: 1 },
    ];
    const event = makeEvent();
    event.participants = ["a", "b", "c"].map((id) => ({
      ...event.participants[0],
      characterId: id,
      name: id.toUpperCase(),
    }));
    await renderOverlay({ event, script: scriptOf(entrants) });

    expect(screen.getByText(/^2\./).textContent).toMatch(/^2\. [BC]$/);
    expect(screen.getByText(/^3\./).textContent).toMatch(/^3\. [BC]$/);
    cleanup();
    await renderOverlay({ script: null });

    expect(screen.queryByText(/^2\./)).toBeNull();
  });

  it("hides a place nobody took", async () => {
    await renderOverlay({ script: scriptOf([{ characterId: "a", tickets: 1 }, { characterId: "b", tickets: 1 }]) });

    expect(screen.getByText(/^2\./)).toBeTruthy();
    expect(screen.queryByText(/^3\./)).toBeNull();
  });

  // Base UI mounts the <img> only once the browser has loaded it, so jsdom keeps the fallback.
  it("keeps the initial as the fallback while the Discord avatar loads", async () => {
    const event = makeEvent();
    event.participants[0] = { ...event.participants[0], discordId: "111", discordAvatar: "hash" };
    await renderOverlay({ event });

    expect(screen.getByText("A")).toBeTruthy();
  });

  it("locks the button while the refresh runs", async () => {
    await renderOverlay({ isContinuing: true });

    expect((screen.getByRole("button", { name: "Đua tiếp" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
