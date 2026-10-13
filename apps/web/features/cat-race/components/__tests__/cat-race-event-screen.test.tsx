// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode } from "@guild/shared/enums";
import type { CatRaceDrawResult, CatRaceEventDetail } from "@guild/shared/schemas";

const m = vi.hoisted(() => ({
  event: { current: {} as Record<string, unknown> },
  deletePrize: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("../../hooks/use-cat-races", () => ({ useCatRaceEvent: () => m.event.current }));
vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useDeleteCatRacePrize: () => ({ mutateAsync: m.deletePrize }),
}));
vi.mock("@/features/attendance", () => ({
  useCharacters: () => ({ data: [{ id: "a" }] }),
}));
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => m.invalidate }));
vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({ title, description, actions }: { title: string; description: string; actions: ReactNode }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </header>
  ),
}));
vi.mock("@/components/shared/confirm-delete-dialog", () => ({
  ConfirmDeleteDialog: ({ open, description, run, onOpenChange }: { open: boolean; description?: string; run: () => Promise<void>; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div>
        <p>{description}</p>
        <button onClick={() => onOpenChange(false)}>close-delete</button>
        <button onClick={() => onOpenChange(true)}>reopen-delete</button>
        <button onClick={() => void run()}>confirm-delete</button>
      </div>
    ) : null,
}));
vi.mock("../end-event-button", () => ({ EndEventButton: () => <button>END</button> }));
vi.mock("../announce-button", () => ({ AnnounceButton: () => <button>ANNOUNCE</button> }));
vi.mock("../race-stage", () => ({
  RaceStage: ({ prize, onEditEntrants, onEditParticipants }: { prize?: { name: string }; onEditEntrants: () => void; onEditParticipants: () => void }) => (
    <div>
      STAGE {prize?.name}
      <button onClick={onEditEntrants}>edit-entrants</button>
      <button onClick={onEditParticipants}>edit-participants</button>
    </div>
  ),
}));
vi.mock("../winners-panel", () => ({
  WinnersPanel: ({ canVoid, onVoid }: { canVoid: boolean; onVoid: (round: unknown) => void }) => (
    <div>
      WINNERS {String(canVoid)}
      <button onClick={() => onVoid({ id: "r1" })}>void-round</button>
    </div>
  ),
}));
vi.mock("../prize-chips", () => ({
  PrizeChips: ({ selectedPrizeId, canEdit, onSelect, onEdit, onDelete, onAdd, event }: {
    selectedPrizeId: string | null;
    canEdit: boolean;
    onSelect: (prize: unknown) => void;
    onEdit: (prize: unknown) => void;
    onDelete: (prize: unknown) => void;
    onAdd: () => void;
    event: CatRaceEventDetail;
  }) => (
    <div>
      CHIPS {selectedPrizeId} {String(canEdit)}
      <button onClick={() => onSelect(event.prizes[1])}>select-second</button>
      <button onClick={() => onEdit(event.prizes[0])}>edit-prize</button>
      <button onClick={() => onDelete(event.prizes[0])}>delete-prize</button>
      <button onClick={onAdd}>add-prize</button>
    </div>
  ),
}));
vi.mock("../participants-dialog", () => ({
  ParticipantsDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div>
        PARTICIPANTS-DIALOG
        <button onClick={() => onOpenChange(false)}>close-participants</button>
        <button onClick={() => onOpenChange(true)}>keep-participants</button>
      </div>
    ) : null,
}));
vi.mock("../entrants-dialog", () => ({
  EntrantsDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div>
        ENTRANTS-DIALOG
        <button onClick={() => onOpenChange(false)}>close-entrants</button>
      </div>
    ) : null,
}));
vi.mock("../prize-form-dialog", () => ({
  PrizeFormDialog: ({ open, prize, onOpenChange }: { open: boolean; prize: { name: string } | null; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div>
        PRIZE-DIALOG {prize?.name ?? "new"}
        <button onClick={() => onOpenChange(false)}>close-prize</button>
      </div>
    ) : null,
}));
vi.mock("../void-round-dialog", () => ({
  VoidRoundDialog: ({ round, onOpenChange }: { round: { id: string } | null; onOpenChange: (open: boolean) => void }) =>
    round ? (
      <div>
        VOID-DIALOG {round.id}
        <button onClick={() => onOpenChange(false)}>close-void</button>
      </div>
    ) : null,
}));

import { useRaceStore } from "../../store/race-store";
import { CatRaceEventScreen } from "../cat-race-event-screen";
import { PRIZE, makeEvent } from "./fixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SECOND_PRIZE = { ...PRIZE, id: "p2", name: "Vé", awardedCount: 0 };

/**
 * Make the event query answer.
 * @param event - The event
 */
function loaded(event: CatRaceEventDetail) {
  m.event.current = { data: event, isPending: false, isError: false, error: null, refetch: vi.fn() };
}

beforeEach(() => {
  useRaceStore.setState({ stage: "idle", pendingResult: null, selectedPrizeId: null });
  loaded(makeEvent({ prizes: [PRIZE, SECOND_PRIZE] }));
});
afterEach(cleanup);

describe("CatRaceEventScreen", () => {
  it("shows a skeleton while loading and the error when it fails", () => {
    m.event.current = { data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() };
    const { unmount } = render(<CatRaceEventScreen id="e1" />);
    expect(screen.queryByRole("heading")).toBeNull();
    unmount();

    m.event.current = { data: undefined, isPending: false, isError: true, error: null, refetch: vi.fn() };
    render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText("Không tải được đợt quay.")).toBeTruthy();
  });

  it("renders nothing for a resolved query without data", () => {
    m.event.current = { data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() };
    render(<CatRaceEventScreen id="e1" />);

    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("shows the title, the mode and the end button on an open event", () => {
    render(<CatRaceEventScreen id="e1" />);

    expect(screen.getByText("Đợt 1")).toBeTruthy();
    expect(screen.getByText("Chế độ Thường")).toBeTruthy();
    expect(screen.getByText("END")).toBeTruthy();
  });

  it("chooses the first drawable prize, skipping a full one before it", () => {
    loaded(makeEvent({ prizes: [{ ...PRIZE, awardedCount: 2 }, SECOND_PRIZE] }));
    render(<CatRaceEventScreen id="e1" />);

    expect(screen.getByText(/STAGE Vé/)).toBeTruthy();
  });

  it("falls back to the first prize when every prize is locked", () => {
    loaded(
      makeEvent({
        prizes: [
          { ...PRIZE, awardedCount: 2 },
          { ...SECOND_PRIZE, awardedCount: 2 },
        ],
      })
    );
    render(<CatRaceEventScreen id="e1" />);

    expect(screen.getByText(/STAGE Tiền mặt/)).toBeTruthy();
  });

  it("offers the Discord post on an ended event, and says when it was done", () => {
    loaded(makeEvent({ status: "ENDED" }));
    const { unmount } = render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText("ANNOUNCE")).toBeTruthy();
    expect(screen.getByText(/CHIPS p1 false/)).toBeTruthy();
    unmount();

    loaded(makeEvent({ status: "ENDED", discordPostedAt: "2026-10-12T03:00:00.000Z" }));
    render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText("Đã đăng lên Discord.")).toBeTruthy();
  });

  it("selects a prize unless a round is busy", () => {
    render(<CatRaceEventScreen id="e1" />);

    fireEvent.click(screen.getByText("select-second"));
    expect(useRaceStore.getState().selectedPrizeId).toBe("p2");

    act(() => useRaceStore.setState({ stage: "racing", selectedPrizeId: "p1" }));
    fireEvent.click(screen.getByText("select-second"));
    expect(useRaceStore.getState().selectedPrizeId).toBe("p1");
    expect(screen.getByText(/CHIPS p1 false/)).toBeTruthy();
  });

  it("opens the participants, entrants, prize and void dialogs", () => {
    render(<CatRaceEventScreen id="e1" />);

    fireEvent.click(screen.getByText("edit-participants"));
    expect(screen.getByText("PARTICIPANTS-DIALOG")).toBeTruthy();

    fireEvent.click(screen.getByText("edit-entrants"));
    expect(screen.getByText("ENTRANTS-DIALOG")).toBeTruthy();
    expect(screen.queryByText("PARTICIPANTS-DIALOG")).toBeNull();

    fireEvent.click(screen.getByText("edit-prize"));
    expect(screen.getByText("PRIZE-DIALOG Tiền mặt")).toBeTruthy();

    fireEvent.click(screen.getByText("add-prize"));
    expect(screen.getByText("PRIZE-DIALOG new")).toBeTruthy();

    fireEvent.click(screen.getByText("void-round"));
    expect(screen.getByText("VOID-DIALOG r1")).toBeTruthy();
    fireEvent.click(screen.getByText("close-void"));
    expect(screen.queryByText(/VOID-DIALOG/)).toBeNull();
  });

  it("asks before deleting a prize, then deletes it", async () => {
    m.deletePrize.mockResolvedValue({});
    render(<CatRaceEventScreen id="e1" />);

    fireEvent.click(screen.getByText("delete-prize"));
    expect(screen.getByText(/Xoá hạng mục Tiền mặt/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByText("confirm-delete"));
    });

    expect(m.deletePrize).toHaveBeenCalledWith({ id: "e1", prizeId: "p1" });
  });

  it("closes each dialog, and ignores an open request from inside one", () => {
    render(<CatRaceEventScreen id="e1" />);

    fireEvent.click(screen.getByText("edit-participants"));
    fireEvent.click(screen.getByText("keep-participants"));
    expect(screen.getByText("PARTICIPANTS-DIALOG")).toBeTruthy();
    fireEvent.click(screen.getByText("close-participants"));
    expect(screen.queryByText("PARTICIPANTS-DIALOG")).toBeNull();

    fireEvent.click(screen.getByText("edit-entrants"));
    fireEvent.click(screen.getByText("close-entrants"));
    expect(screen.queryByText("ENTRANTS-DIALOG")).toBeNull();

    fireEvent.click(screen.getByText("add-prize"));
    fireEvent.click(screen.getByText("close-prize"));
    expect(screen.queryByText(/PRIZE-DIALOG/)).toBeNull();

    fireEvent.click(screen.getByText("delete-prize"));
    fireEvent.click(screen.getByText("reopen-delete"));
    expect(screen.getByText("close-delete")).toBeTruthy();
    fireEvent.click(screen.getByText("close-delete"));
    expect(screen.queryByText("close-delete")).toBeNull();
  });

  it("mounts without an entrants dialog when the event has no prize", () => {
    loaded(makeEvent({ prizes: [], mode: CatRaceMode.TICKET }));
    render(<CatRaceEventScreen id="e1" />);

    fireEvent.click(screen.getByText("edit-entrants"));

    expect(screen.queryByText("ENTRANTS-DIALOG")).toBeNull();
  });

  it("resets the shared store on leave, refreshing when a drawn round was never shown", () => {
    const { unmount } = render(<CatRaceEventScreen id="e1" />);
    useRaceStore.setState({
      stage: "result",
      selectedPrizeId: "p2",
      pendingResult: { winningTicket: 1 } as CatRaceDrawResult,
    });

    unmount();

    expect(useRaceStore.getState()).toMatchObject({
      stage: "idle",
      pendingResult: null,
      selectedPrizeId: null,
    });
    expect(m.invalidate).toHaveBeenCalledTimes(1);
  });

  it("does not refresh on leave when nothing is pending", () => {
    const { unmount } = render(<CatRaceEventScreen id="e1" />);

    unmount();

    expect(m.invalidate).not.toHaveBeenCalled();
  });
});
