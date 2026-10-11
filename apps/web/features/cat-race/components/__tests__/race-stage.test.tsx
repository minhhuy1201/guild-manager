// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode, GuildClass, PrizeTier } from "@guild/shared/enums";
import type { CatRaceDrawResult, CatRaceEventDetail } from "@guild/shared/schemas";

const { mutateAsync, toastError, reducedMotion } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toastError: vi.fn(),
  reducedMotion: { current: false },
}));

vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useDrawCatRaceRound: () => ({ mutateAsync }),
}));
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => vi.fn() }));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => () => false,
}));
vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => reducedMotion.current,
}));
vi.mock("@/components/shared/toast", () => ({ toastError }));
vi.mock("../race-canvas", () => ({ RaceCanvas: () => <div>CANVAS</div> }));
vi.mock("../race-result-overlay", () => ({
  RaceResultOverlay: () => <div>RESULT</div>,
}));

import { useRaceStore } from "../../store/race-store";
import { RaceStage } from "../race-stage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PRIZE = {
  id: "p1",
  name: "Tiền mặt",
  quantity: 2,
  tier: PrizeTier.HIGH,
  sortOrder: 0,
  awardedCount: 0,
  entrantIds: ["a", "b"],
};
const EVENT: CatRaceEventDetail = {
  id: "e1",
  name: "Đợt",
  mode: CatRaceMode.STANDARD,
  status: "OPEN",
  createdAt: "2026-10-12T00:00:00.000Z",
  discordPostedAt: null,
  awardedCount: 0,
  participants: ["a", "b"].map((id) => ({
    characterId: id,
    name: id,
    guildClass: GuildClass.TO_VAN,
    discordId: null,
    discordAvatar: null,
    tickets: 1,
  })),
  prizes: [PRIZE],
  rounds: [],
};
const RESULT = {
  round: { prizeId: "p1", winnerCharacterId: "a" },
  entrants: [
    { characterId: "a", tickets: 1 },
    { characterId: "b", tickets: 1 },
  ],
  winningTicket: 1,
} as unknown as CatRaceDrawResult;

/**
 * Render the stage for an event and prize.
 * @param event - Event shown
 * @param prize - Prize for the next round
 */
function renderStage(event = EVENT, prize = PRIZE) {
  render(
    <RaceStage
      event={event}
      prize={prize}
      canEdit
      onEditEntrants={() => {}}
      onEditParticipants={() => {}}
    />
  );
}

beforeEach(() => {
  reducedMotion.current = false;
  useRaceStore.getState().reset();
});
afterEach(cleanup);

describe("RaceStage", () => {
  it("does not draw while the prize is locked, and says why", () => {
    renderStage(EVENT, { ...PRIZE, awardedCount: 2 });

    const button = screen.getByRole("button", { name: /ĐUA/ });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText("Hạng mục đã đủ giải.")).toBeTruthy();
  });

  it("jumps straight to the result under reduced motion", async () => {
    reducedMotion.current = true;
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect(mutateAsync).toHaveBeenCalledWith({ id: "e1", prizeId: "p1" });
    expect(useRaceStore.getState().stage).toBe("result");
    expect(screen.getByText("RESULT")).toBeTruthy();
    expect(screen.queryByText("CANVAS")).toBeNull();
  });

  it("starts the replay when motion is allowed", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect(useRaceStore.getState().stage).toBe("racing");
    expect(screen.getByText("CANVAS")).toBeTruthy();
  });

  it("goes back to idle and toasts the server's sentence when the draw fails", async () => {
    mutateAsync.mockRejectedValue(new Error("Hạng mục đã đủ giải."));
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect(useRaceStore.getState().stage).toBe("idle");
    expect(toastError).toHaveBeenCalledWith("Hạng mục đã đủ giải.");
  });
});
