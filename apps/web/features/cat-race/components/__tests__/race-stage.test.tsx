// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode, GuildClass, PrizeTier } from "@guild/shared/enums";
import type { CatRaceDrawResult, CatRaceEventDetail } from "@guild/shared/schemas";

const { mutateAsync, invalidate, recover, toastError, reducedMotion } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  invalidate: vi.fn(),
  recover: vi.fn(() => false),
  toastError: vi.fn(),
  reducedMotion: { current: false },
}));

vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useDrawCatRaceRound: () => ({ mutateAsync }),
}));
vi.mock("@/hooks/use-invalidate", () => ({ useInvalidate: () => invalidate }));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => recover,
}));
vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => reducedMotion.current,
}));
vi.mock("@/components/shared/toast", () => ({ toastError }));
vi.mock("../race-canvas", () => ({
  RaceCanvas: ({
    onFinish,
    onStandings,
    skipSignal,
    isPreview,
    laneOrder,
  }: {
    onFinish: () => void;
    onStandings: (keys: string[]) => void;
    skipSignal: number;
    isPreview?: boolean;
    laneOrder: string[] | null;
  }) => (
    <div>
      {isPreview ? "PREVIEW" : `CANVAS ${skipSignal}`}
      <span>{`LANES ${laneOrder?.join(",") ?? "none"}`}</span>
      <button onClick={onFinish}>finish</button>
      <button onClick={() => onStandings(["b#1", "a#1"])}>standings</button>
    </div>
  ),
}));
vi.mock("../race-result-overlay", () => ({
  RaceResultOverlay: ({
    onContinue,
    isContinuing,
  }: {
    onContinue: () => void;
    isContinuing: boolean;
  }) => (
    <div>
      RESULT {String(isContinuing)}
      <button onClick={onContinue}>continue</button>
    </div>
  ),
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
function renderStage(event = EVENT, prize = PRIZE, isDurationValid = true) {
  render(<RaceStage event={event} prize={prize} isDurationValid={isDurationValid} />);
}

beforeEach(() => {
  reducedMotion.current = false;
  useRaceStore.getState().reset();
  useRaceStore.setState({ laneOrder: null });
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
    expect(screen.getByText(/RESULT/)).toBeTruthy();
    expect(screen.queryByText(/CANVAS/)).toBeNull();
  });

  it("starts the replay when motion is allowed", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect(useRaceStore.getState().stage).toBe("racing");
    expect(screen.getByText(/CANVAS/)).toBeTruthy();
  });

  it("shuffles the lanes of the start line into the store and passes them to the canvas", () => {
    renderStage();
    expect(screen.getByText("LANES none")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Xáo trộn/ }));

    const order = useRaceStore.getState().laneOrder;
    expect(order?.prizeId).toBe("p1");
    expect([...(order?.keys ?? [])].sort()).toEqual(["a#1", "b#1"]);
    expect(screen.getByText(`LANES ${order!.keys.join(",")}`)).toBeTruthy();
  });

  it("changes the lanes on every click", () => {
    renderStage();
    const button = screen.getByRole("button", { name: /Xáo trộn/ });

    fireEvent.click(button);
    const first = useRaceStore.getState().laneOrder!.keys;
    fireEvent.click(button);

    expect(useRaceStore.getState().laneOrder!.keys).not.toEqual(first);
  });

  it("ignores a shuffle made for another prize", () => {
    useRaceStore.getState().shuffleLanes("other", ["b#1", "a#1"]);
    renderStage();

    expect(screen.getByText("LANES none")).toBeTruthy();
  });

  it("locks the shuffle for a single cat and while a round runs", async () => {
    renderStage(EVENT, { ...PRIZE, entrantIds: ["a"] });
    expect((screen.getByRole("button", { name: /Xáo trộn/ }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();

    mutateAsync.mockReturnValue(new Promise(() => {}));
    renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect((screen.getByRole("button", { name: /Xáo trộn/ }) as HTMLButtonElement).disabled).toBe(true);
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

  it("stays silent when the session recovery took over a failed draw", async () => {
    mutateAsync.mockRejectedValue(new Error("401"));
    recover.mockReturnValueOnce(true);
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect(toastError).not.toHaveBeenCalled();
  });

  it("refreshes the winners and leaves the store alone when the screen was left mid-draw", async () => {
    let answer: (value: CatRaceDrawResult) => void = () => {};
    mutateAsync.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });
    act(() => useRaceStore.getState().reset());
    await act(async () => answer(RESULT));

    expect(invalidate).toHaveBeenCalled();
    expect(useRaceStore.getState().stage).toBe("idle");
  });

  it("locks ĐUA while the server is answering, so a second press draws nothing", async () => {
    mutateAsync.mockReturnValue(new Promise(() => {}));
    renderStage();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });
    const button = screen.getByRole("button", { name: /ĐUA/ }) as HTMLButtonElement;
    fireEvent.click(button);

    expect(button.disabled).toBe(true);
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("shows every cat on the live board while racing, and skips on request", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();
    expect(screen.getByText("Bảng xếp hạng hiện khi bắt đầu đua.")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    fireEvent.click(screen.getByText("standings"));
    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toEqual(["1b", "2a"]);
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));

    expect(screen.getByText(/CANVAS 1/)).toBeTruthy();
  });

  it("shows the winner card when the replay ends, then refreshes and resets on continue", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    invalidate.mockResolvedValue(undefined);
    renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    fireEvent.click(screen.getByText("finish"));
    expect(useRaceStore.getState().stage).toBe("result");
    await act(async () => {
      fireEvent.click(screen.getByText("continue"));
    });

    expect(invalidate).toHaveBeenCalled();
    expect(useRaceStore.getState().stage).toBe("idle");
  });

  it("shows the track with the cats before the first round, and not behind the winner card", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();
    expect(screen.getByText("PREVIEW")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });
    fireEvent.click(screen.getByText("finish"));

    expect(screen.queryByText("PREVIEW")).toBeNull();
  });

  it("states the prize and the number of people above the track", () => {
    renderStage();

    expect(screen.getByText("Hạng mục: Tiền mặt · 2 người")).toBeTruthy();
  });

  it("adds the ticket total in TICKET mode", () => {
    const event = { ...EVENT, mode: CatRaceMode.TICKET };
    event.participants = event.participants.map((p) => ({ ...p, tickets: 3 }));
    renderStage(event);

    expect(screen.getByText("Hạng mục: Tiền mặt · 2 người · 6 vé")).toBeTruthy();
  });

  it("says nobody is in the list instead of showing an empty track", () => {
    renderStage(EVENT, { ...PRIZE, entrantIds: [] });

    expect(screen.queryByText("PREVIEW")).toBeNull();
    expect(screen.getByText("Chưa có ai trong danh sách đua.")).toBeTruthy();
  });

  it("locks ĐUA while the typed duration is out of range", () => {
    renderStage(EVENT, PRIZE, false);

    expect((screen.getByRole("button", { name: /ĐUA/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("says there is no prize and offers a bare ĐUA", () => {
    render(<RaceStage event={EVENT} prize={undefined} isDurationValid />);

    expect(screen.getByText("Chưa có hạng mục.")).toBeTruthy();
    expect(screen.queryByText("Chưa có ai trong danh sách đua.")).toBeNull();
    expect(screen.queryByText(/người/)).toBeNull();
    expect((screen.getByRole("button", { name: "ĐUA" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("ranks the finished race on the board when reduced motion skipped the replay", async () => {
    reducedMotion.current = true;
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe("1a");
  });

  it("keeps the final order on the board after the replay, and clears it for the next round", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    invalidate.mockResolvedValue(undefined);
    renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });
    fireEvent.click(screen.getByText("standings"));
    fireEvent.click(screen.getByText("finish"));

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await act(async () => {
      fireEvent.click(screen.getByText("continue"));
    });

    expect(screen.getByText("Bảng xếp hạng hiện khi bắt đầu đua.")).toBeTruthy();
  });
});
