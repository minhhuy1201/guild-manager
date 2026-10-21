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

// next/font only works through the Next compiler; the stage font is a stand-in here.
vi.mock("next/font/google", () => ({
  Bungee: () => ({ variable: "bungee-variable", style: { fontFamily: "'Bungee', 'Bungee Fallback'" } }),
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
    onCue,
    skipSignal,
    isPreview,
    laneOrder,
  }: {
    onFinish: () => void;
    onStandings: (rows: readonly RaceStanding[]) => void;
    onCue: (cue: RaceCue) => void;
    skipSignal: number;
    isPreview?: boolean;
    laneOrder: string[] | null;
  }) => (
    <div>
      {isPreview ? "PREVIEW" : `CANVAS ${skipSignal}`}
      <span>{`LANES ${laneOrder?.join(",") ?? "none"}`}</span>
      <button onClick={onFinish}>finish</button>
      <button
        onClick={() =>
          onStandings([
            { key: "b#1", lengthsBehind: 0 },
            { key: "a#1", lengthsBehind: 1.234 },
          ])
        }
      >
        standings
      </button>
      <button
        onClick={() =>
          onStandings([
            { key: "a#1", lengthsBehind: 0 },
            { key: "b#1", lengthsBehind: 0.8 },
          ])
        }
      >
        standings swapped
      </button>
      <button onClick={() => onCue({ kind: "countdown", step: 0 })}>cue countdown</button>
      <button onClick={() => onCue({ kind: "go" })}>cue go</button>
      <button onClick={() => onCue({ kind: "lead-change", catKey: "b#1" })}>cue lead</button>
      <button onClick={() => onCue({ kind: "slow-motion", isOn: true })}>cue slow</button>
      <button onClick={() => onCue({ kind: "finish", isPhotoFinish: true, lengthsBehind: 0.1 })}>
        cue photo
      </button>
      <button onClick={() => onCue({ kind: "finish", isPhotoFinish: false, lengthsBehind: 2 })}>
        cue finish
      </button>
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

import type { RaceStanding } from "../../lib/race-board";
import type { RaceCue } from "../../lib/race-cue";
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
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
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

  it("never lands on the A-Z lanes already shown, even with two cats", () => {
    for (let run = 0; run < 20; run += 1) {
      cleanup();
      useRaceStore.setState({ laneOrder: null });
      renderStage();
      fireEvent.click(screen.getByRole("button", { name: /Xáo trộn/ }));

      expect(useRaceStore.getState().laneOrder!.keys).toEqual(["b#1", "a#1"]);
    }
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
    expect(rows).toEqual(["1b", "2a-1,2"]);
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

  describe("broadcast bar", () => {
    const liveTag = () => screen.getByText("TRỰC TIẾP").getAttribute("data-on");

    it("states the prize with its tier and the number of people above the track", () => {
      renderStage();

      expect(screen.getByText("Đặc biệt · Tiền mặt").getAttribute("data-tier")).toBe("HIGH");
      expect(screen.getByText("2 người")).toBeTruthy();
      expect(screen.getByText("00.0s")).toBeTruthy();
    });

    it("adds the ticket total in TICKET mode", () => {
      const event = { ...EVENT, mode: CatRaceMode.TICKET };
      event.participants = event.participants.map((p) => ({ ...p, tickets: 3 }));
      renderStage(event);

      expect(screen.getByText("2 người · 6 vé")).toBeTruthy();
    });

    it("lights TRỰC TIẾP only while the round races and greys it at the card", async () => {
      mutateAsync.mockResolvedValue(RESULT);
      renderStage();
      expect(liveTag()).toBe("false");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
      });
      expect(liveTag()).toBe("true");
      fireEvent.click(screen.getByText("finish"));

      expect(liveTag()).toBe("false");
    });

    it("counts seconds from go and freezes at the finish", async () => {
      const now = vi.spyOn(performance, "now");
      now.mockReturnValue(10_000);
      mutateAsync.mockResolvedValue(RESULT);
      renderStage();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
      });

      fireEvent.click(screen.getByText("cue go"));
      now.mockReturnValue(13_000);
      fireEvent.click(screen.getByText("cue finish"));
      now.mockReturnValue(20_000);
      fireEvent.click(screen.getByText("finish"));

      expect(screen.getByText("03.0s")).toBeTruthy();
      now.mockRestore();
    });

    it("shows an arrow for the cat that moved up on the next board update", async () => {
      mutateAsync.mockResolvedValue(RESULT);
      renderStage();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
      });

      fireEvent.click(screen.getByText("standings"));
      fireEvent.click(screen.getByText("standings swapped"));

      const rows = screen.getAllByRole("listitem").map((row) => row.textContent);
      expect(rows[0]).toContain("▲");
      expect(rows[1]).toContain("▼");
    });
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

  describe("broadcast overlays", () => {
    /** Start a round and wait for the canvas. */
    async function startRace() {
      mutateAsync.mockResolvedValue(RESULT);
      renderStage();
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
      });
    }

    it("counts down with lanterns and the number, then banners CHẠY! on go", async () => {
      await startRace();

      fireEvent.click(screen.getByText("cue countdown"));
      expect(screen.getByText("3")).toBeTruthy();
      fireEvent.click(screen.getByText("cue go"));

      expect(screen.getByText("CHẠY!")).toBeTruthy();
      expect(document.querySelector(".race-countdown")?.getAttribute("data-on")).toBe("false");
    });

    it("shows the lead-change bar with the cat's label and CHẬM ×3 on its cues", async () => {
      await startRace();

      fireEvent.click(screen.getByText("cue lead"));
      fireEvent.click(screen.getByText("cue slow"));

      expect(screen.getByText("ĐỔI NGÔI")).toBeTruthy();
      expect(document.querySelector(".race-lead-bar em")?.textContent).toBe("b");
      expect(document.querySelector(".race-slowmo")?.getAttribute("data-on")).toBe("true");
    });

    it("shows the finish photo only when the finish cue says photo finish", async () => {
      await startRace();

      fireEvent.click(screen.getByText("cue finish"));
      expect(document.querySelector(".race-flash")).not.toBeNull();
      expect(screen.queryByText("ẢNH ĐÍCH")).toBeNull();
      fireEvent.click(screen.getByText("cue photo"));

      expect(screen.getByText("ẢNH ĐÍCH")).toBeTruthy();
    });

    it("takes every overlay off when the round ends or is skipped, photo and flash included", async () => {
      await startRace();
      fireEvent.click(screen.getByText("cue photo"));
      expect(screen.getByText("ẢNH ĐÍCH")).toBeTruthy();

      fireEvent.click(screen.getByText("finish"));

      expect(screen.queryByText("ẢNH ĐÍCH")).toBeNull();
      expect(document.querySelector(".race-flash")).toBeNull();
      expect(screen.getByText(/RESULT/)).toBeTruthy();
    });

    it("starts the next round with clean overlays", async () => {
      invalidate.mockResolvedValue(undefined);
      await startRace();
      fireEvent.click(screen.getByText("cue go"));
      fireEvent.click(screen.getByText("finish"));
      await act(async () => {
        fireEvent.click(screen.getByText("continue"));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
      });

      expect(screen.queryByText("CHẠY!")).toBeNull();
    });

    it("shows no overlay under reduced motion, which jumps to the result", async () => {
      reducedMotion.current = true;
      await startRace();

      expect(document.querySelector(".race-countdown")).toBeNull();
      expect(screen.getByText(/RESULT/)).toBeTruthy();
    });
  });
});
