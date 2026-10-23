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
  realStage: { current: false },
  fullscreenElement: { current: null as Element | null },
  isWide: { current: true },
}));

// next/font only works through the Next compiler; the stage font is a stand-in here.
vi.mock("next/font/google", () => ({
  Bungee: () => ({ variable: "bungee-variable", style: { fontFamily: "Bungee" } }),
}));
vi.mock("../race-canvas", () => ({ RaceCanvas: () => <div>CANVAS</div> }));
vi.mock("../race-result-overlay", () => ({ RaceResultOverlay: () => <div>RESULT</div> }));
vi.mock("@/hooks/use-session-recovery", () => ({ useSessionRecovery: () => () => false }));
vi.mock("@/hooks/use-reduced-motion", () => ({ useReducedMotion: () => false }));
vi.mock("@/components/shared/toast", () => ({ toastError: vi.fn() }));

vi.mock("../../hooks/use-cat-races", () => ({ useCatRaceEvent: () => m.event.current }));
vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useDeleteCatRacePrize: () => ({ mutateAsync: m.deletePrize }),
  useDrawCatRaceRound: () => ({ mutateAsync: vi.fn() }),
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
vi.mock("../end-event-button", () => ({
  EndEventButton: ({ disabled }: { disabled?: boolean }) => <button disabled={disabled}>END</button>,
}));
vi.mock("../announce-button", () => ({ AnnounceButton: () => <button>ANNOUNCE</button> }));
// The focus tests need the real stage (the bar and ĐUA live in it); the rest keep the stand-in.
vi.mock("../race-stage", async () => {
  const actual = await vi.importActual<typeof import("../race-stage")>("../race-stage");
  return {
    RaceStage: (props: React.ComponentProps<typeof actual.RaceStage>) =>
      m.realStage.current ? (
        <actual.RaceStage {...props} />
      ) : (
        <div>
          STAGE {props.prize?.name} valid:{String(props.isDurationValid)}
        </div>
      ),
  };
});
vi.mock("../race-controls", () => ({
  RaceControls: ({ durationText, onDurationTextChange, onEditEntrants, onEditParticipants }: { durationText: string; onDurationTextChange: (text: string) => void; onEditEntrants: () => void; onEditParticipants: () => void }) => (
    <div>
      DURATION {durationText}
      <button onClick={() => onDurationTextChange("35")}>type-valid</button>
      <button onClick={() => onDurationTextChange("9")}>type-invalid</button>
      <button onClick={onEditEntrants}>edit-entrants</button>
      <button onClick={onEditParticipants}>edit-participants</button>
    </div>
  ),
}));
vi.mock("../cat-race-results", () => ({ CatRaceResults: () => <div>RESULTS</div> }));
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
  vi.stubGlobal("matchMedia", () => ({ matches: m.isWide.current }));
  m.realStage.current = false;
  useRaceStore.setState({ stage: "idle", pendingResult: null, selectedPrizeId: null });
  loaded(makeEvent({ prizes: [PRIZE, SECOND_PRIZE] }));
});
afterEach(() => {
  cleanup();
  m.fullscreenElement.current = null;
  m.isWide.current = true;
  vi.unstubAllGlobals();
});

/**
 * Stub the Fullscreen API, which jsdom lacks.
 * @param request - What `requestFullscreen` does
 * @returns The two stubs, to assert against
 */
function stubFullscreen(request: () => Promise<void> = () => Promise.resolve()) {
  const requestFullscreen = vi.fn(request);
  const exitFullscreen = vi.fn(() => Promise.resolve());
  Object.defineProperty(document.documentElement, "requestFullscreen", {
    configurable: true,
    value: requestFullscreen,
  });
  Object.defineProperty(document, "exitFullscreen", {
    configurable: true,
    value: exitFullscreen,
  });
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => m.fullscreenElement.current,
  });
  return { requestFullscreen, exitFullscreen };
}

describe("CatRaceEventScreen", () => {
  it("shows a skeleton while loading and the error when it fails", () => {
    m.event.current = { data: undefined, isPending: true, isError: false, error: null, refetch: vi.fn() };
    const { unmount } = render(<CatRaceEventScreen id="e1" />);
    expect(screen.queryByRole("heading")).toBeNull();
    unmount();

    m.event.current = { data: undefined, isPending: false, isError: true, error: null, refetch: vi.fn() };
    render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText("Không tải được đợt đua.")).toBeTruthy();
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

  it("stores a valid typed duration and tells the stage it can race", () => {
    useRaceStore.setState({ durationSeconds: 20 });
    render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText(/DURATION 20/)).toBeTruthy();

    fireEvent.click(screen.getByText("type-valid"));

    expect(useRaceStore.getState().durationSeconds).toBe(35);
    expect(screen.getByText(/valid:true/)).toBeTruthy();
  });

  it("keeps the stored duration for an invalid one and tells the stage to lock", () => {
    useRaceStore.setState({ durationSeconds: 20 });
    render(<CatRaceEventScreen id="e1" />);

    fireEvent.click(screen.getByText("type-invalid"));

    expect(useRaceStore.getState().durationSeconds).toBe(20);
    expect(screen.getByText(/DURATION 9/)).toBeTruthy();
    expect(screen.getByText(/valid:false/)).toBeTruthy();
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

  it("shows the results board instead of the race area on an ended event", () => {
    loaded(makeEvent({ status: "ENDED" }));
    render(<CatRaceEventScreen id="e1" />);

    expect(screen.getByText("RESULTS")).toBeTruthy();
    expect(screen.queryByText(/STAGE/)).toBeNull();
    expect(screen.queryByText(/CHIPS/)).toBeNull();
    expect(screen.queryByText(/DURATION/)).toBeNull();
  });

  it("offers the Discord post on an ended event, and says when it was done", () => {
    loaded(makeEvent({ status: "ENDED" }));
    const { unmount } = render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText("ANNOUNCE")).toBeTruthy();
    expect(screen.queryByText("END")).toBeNull();
    unmount();

    loaded(makeEvent({ status: "ENDED", discordPostedAt: "2026-10-12T03:00:00.000Z" }));
    render(<CatRaceEventScreen id="e1" />);
    expect(screen.getByText("Đã đăng lên Discord.")).toBeTruthy();
  });

  it("locks the end button while a race runs", () => {
    render(<CatRaceEventScreen id="e1" />);
    expect((screen.getByText("END") as HTMLButtonElement).disabled).toBe(false);

    act(() => useRaceStore.setState({ stage: "racing" }));

    expect((screen.getByText("END") as HTMLButtonElement).disabled).toBe(true);
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

  describe("focus mode", () => {
    const ENTER_NAME = /Toàn màn hình/;
    const DIALOG_NAME = "Đua mèo toàn màn hình";

    beforeEach(() => {
      m.realStage.current = true;
      stubFullscreen();
    });

    /**
     * The entry button, which is the only one named "Toàn màn hình" while the mode is off.
     * @returns The button
     */
    const enterButton = () => screen.getByRole("button", { name: ENTER_NAME });

    it("offers the entry button on an open event, and none on an ended one", () => {
      const { unmount } = render(<CatRaceEventScreen id="e1" />);
      expect(enterButton()).toBeTruthy();
      unmount();

      loaded(makeEvent({ status: "ENDED" }));
      render(<CatRaceEventScreen id="e1" />);
      expect(screen.queryByRole("button", { name: ENTER_NAME })).toBeNull();
    });

    it("opens a dialog with the broadcast bar and ĐUA, and hides the header and winners", () => {
      render(<CatRaceEventScreen id="e1" />);
      expect(screen.getByText("WINNERS true")).toBeTruthy();

      fireEvent.click(enterButton());

      const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
      expect(dialog.querySelector('[data-slot="cat-race-hud"]')).not.toBeNull();
      expect(dialog.textContent).toContain("TRỰC TIẾP");
      expect(dialog.contains(screen.getByRole("button", { name: /ĐUA/ }))).toBe(true);
      expect(screen.queryByRole("heading", { name: "Đợt 1" })).toBeNull();
      expect(screen.queryByText(/WINNERS/)).toBeNull();
      expect(screen.queryByText(/CHIPS/)).toBeNull();
      expect(screen.queryByText(/DURATION/)).toBeNull();
    });

    it("opens on the F key, not from a field, and not with a modifier", () => {
      render(<CatRaceEventScreen id="e1" />);
      const input = document.createElement("input");
      document.body.appendChild(input);
      fireEvent.keyDown(input, { key: "f" });
      fireEvent.keyDown(document.body, { key: "f", ctrlKey: true });
      input.remove();
      expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();

      fireEvent.keyDown(document.body, { key: "f" });

      expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
    });

    it("closes on Esc and on the exit button, handing focus back to the entry button", () => {
      render(<CatRaceEventScreen id="e1" />);

      fireEvent.click(enterButton());
      fireEvent.keyDown(screen.getByRole("dialog", { name: DIALOG_NAME }), { key: "Escape" });
      expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
      expect(document.activeElement).toBe(enterButton());

      fireEvent.click(enterButton());
      fireEvent.click(screen.getByRole("button", { name: "Thoát toàn màn hình" }));
      expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
      expect(document.activeElement).toBe(enterButton());
    });

    it("asks for fullscreen on the document, and still opens when refused", async () => {
      const { requestFullscreen } = stubFullscreen(() => Promise.reject(new Error("denied")));
      render(<CatRaceEventScreen id="e1" />);

      await act(async () => {
        fireEvent.click(enterButton());
      });

      expect(requestFullscreen).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();
    });

    describe("prize picker", () => {
      const LOCKED_PRIZE = { ...PRIZE, id: "p3", name: "Đã hết", quantity: 1, awardedCount: 1 };
      const PICKER_NAME = "Chọn hạng mục";

      beforeEach(() => {
        loaded(makeEvent({ prizes: [PRIZE, SECOND_PRIZE, LOCKED_PRIZE] }));
      });

      /**
       * Enter focus mode and open the picker's list.
       * @returns The picker trigger
       */
      const openPicker = () => {
        render(<CatRaceEventScreen id="e1" />);
        fireEvent.click(enterButton());
        const trigger = screen.getByRole("combobox", { name: PICKER_NAME });
        fireEvent.click(trigger);
        return trigger;
      };

      it("switches the bar and the ĐUA button to the chosen prize", async () => {
        openPicker();

        // Base UI only commits a click that began with a pointer press on the item.
        const option = await screen.findByRole("option", { name: /Vé/ });
        fireEvent.pointerDown(option);
        fireEvent.click(option);

        const dialog = screen.getByRole("dialog", { name: DIALOG_NAME });
        expect(screen.getByRole("combobox", { name: PICKER_NAME }).textContent).toContain("Vé");
        expect(dialog.contains(screen.getByRole("button", { name: /ĐUA: Vé/ }))).toBe(true);
      });

      it("lists a locked prize as disabled, with its reason", async () => {
        openPicker();

        const option = await screen.findByRole("option", { name: /Đã hết/ });

        expect(option.getAttribute("aria-disabled")).toBe("true");
        expect(option.textContent).toContain("Hạng mục đã đủ giải.");
        expect(screen.getByRole("option", { name: /Vé/ }).getAttribute("aria-disabled")).not.toBe(
          "true"
        );
      });

      it.each(["drawing", "racing", "result"] as const)(
        "is disabled while the stage is %s",
        (stage) => {
          render(<CatRaceEventScreen id="e1" />);
          fireEvent.click(enterButton());
          act(() => useRaceStore.setState({ stage }));

          const trigger = screen.getByRole("combobox", { name: PICKER_NAME });
          fireEvent.click(trigger);

          expect(trigger.hasAttribute("disabled") || trigger.getAttribute("aria-disabled") === "true").toBe(true);
          expect(screen.queryByRole("option")).toBeNull();
        }
      );

      it("is absent outside focus mode", () => {
        render(<CatRaceEventScreen id="e1" />);

        expect(screen.queryByRole("combobox", { name: PICKER_NAME })).toBeNull();
      });
    });

    it("closes when the browser leaves fullscreen", async () => {
      render(<CatRaceEventScreen id="e1" />);
      await act(async () => {
        fireEvent.click(enterButton());
      });
      m.fullscreenElement.current = document.documentElement;
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });
      expect(screen.getByRole("dialog", { name: DIALOG_NAME })).toBeTruthy();

      m.fullscreenElement.current = null;
      act(() => {
        document.dispatchEvent(new Event("fullscreenchange"));
      });

      expect(screen.queryByRole("dialog", { name: DIALOG_NAME })).toBeNull();
    });
  });
});
