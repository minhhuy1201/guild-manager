// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CatRaceMode, GuildClass, PrizeTier } from "@guild/shared/enums";
import type { CatRaceDrawResult, CatRaceEventDetail } from "@guild/shared/schemas";

const { mutateAsync, invalidate, recover, toastError, reducedMotion, canvasMounts } = vi.hoisted(() => ({
  canvasMounts: { count: 0 },
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
    mode,
    laneOrder,
  }: {
    onFinish: () => void;
    onStandings: (rows: readonly RaceStanding[]) => void;
    onCue: (cue: RaceCue) => void;
    skipSignal: number;
    mode?: string;
    laneOrder: string[] | null;
  }) => {
    // Counts real mounts: a remount of the canvas would restart the race.
    useEffect(() => {
      canvasMounts.count += 1;
    }, []);

    return (
    <div>
      {mode === "start" ? "PREVIEW" : mode === "finish" ? "FINISH LINE" : `CANVAS ${skipSignal}`}
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
      <button onClick={() => onCue({ kind: "finish", lengthsBehind: 2 })}>
        cue finish
      </button>
    </div>
    );
  },
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
function renderStage(event = EVENT, prize = PRIZE, isDurationValid = true, active = false) {
  const stage = (isActive: boolean) => (
    <RaceStage
      event={event}
      prize={prize}
      isDurationValid={isDurationValid}
      focus={{ active: isActive, exit: vi.fn() }}
      onSelectPrize={vi.fn()}
    />
  );
  const view = render(stage(active));
  return { setFocus: (isActive: boolean) => view.rerender(stage(isActive)) };
}

beforeEach(() => {
  reducedMotion.current = false;
  canvasMounts.count = 0;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;
  useRaceStore.getState().reset();
  useRaceStore.setState({ laneOrder: null });
});
afterEach(cleanup);

describe("RaceStage", () => {
  it("keeps the canvas mounted once when focus mode flips on and off mid-race", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    const { setFocus } = renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });
    expect(useRaceStore.getState().stage).toBe("racing");
    const mountsBefore = canvasMounts.count;

    setFocus(true);
    expect(screen.getByRole("dialog", { name: "Đua mèo toàn màn hình" })).toBeTruthy();
    setFocus(false);

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(canvasMounts.count).toBe(mountsBefore);
    expect(screen.getByText(/CANVAS/)).toBeTruthy();
  });

  it("carries the broadcast bar and the controls into the focus dialog, once each", () => {
    renderStage(EVENT, PRIZE, true, true);

    const dialog = screen.getByRole("dialog", { name: "Đua mèo toàn màn hình" });
    expect(dialog.querySelector('[data-slot="cat-race-hud"]')).not.toBeNull();
    expect(dialog.textContent).toContain("TRỰC TIẾP");
    expect(screen.getAllByRole("button", { name: /ĐUA/ })).toHaveLength(1);
    expect(dialog.contains(screen.getByRole("button", { name: /ĐUA/ }))).toBe(true);
    expect(screen.getAllByText("TRỰC TIẾP")).toHaveLength(1);
  });

  it("exits through the shell's exit button", () => {
    const exit = vi.fn();
    render(
      <RaceStage event={EVENT} prize={PRIZE} isDurationValid focus={{ active: true, exit }} onSelectPrize={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Thoát toàn màn hình" }));

    expect(exit).toHaveBeenCalledTimes(1);
  });

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

  it("shows the cats on the start line before the first round, and the finished race behind the winner card", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();
    expect(screen.getByText("PREVIEW")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });
    fireEvent.click(screen.getByText("finish"));

    expect(screen.queryByText("PREVIEW")).toBeNull();
    expect(screen.getByText("FINISH LINE")).toBeTruthy();
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
    render(<RaceStage event={EVENT} prize={undefined} isDurationValid focus={{ active: false, exit: vi.fn() }} onSelectPrize={vi.fn()} />);

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
      expect(document.querySelector(".race-digit")?.textContent).toBe("3");
      fireEvent.click(screen.getByText("cue go"));

      expect(document.querySelector(".race-banner")?.textContent).toBe("CHẠY!");
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

    it("flashes and shows the finish photo on every finish cue", async () => {
      await startRace();

      fireEvent.click(screen.getByText("cue finish"));
      expect(document.querySelector(".race-flash")).not.toBeNull();

      expect(screen.getByText("ẢNH ĐÍCH")).toBeTruthy();
    });

    it("takes every overlay off when the round ends or is skipped, photo and flash included", async () => {
      await startRace();
      fireEvent.click(screen.getByText("cue finish"));
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

/**
 * Start a round and wait for the replay to mount.
 * @param active - Whether the stage renders in focus mode
 */
async function startRacing(active: boolean) {
  mutateAsync.mockResolvedValue(RESULT);
  renderStage(EVENT, PRIZE, true, active);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
  });
  expect(useRaceStore.getState().stage).toBe("racing");
}

describe("RaceStage skip key", () => {
  it.each([false, true])("skips on S while racing (focus mode %s), in either case", async (active) => {
    await startRacing(active);

    fireEvent.keyDown(window, { key: "s" });
    expect(screen.getByText(/CANVAS 1/)).toBeTruthy();
    fireEvent.keyDown(window, { key: "S" });
    expect(screen.getByText(/CANVAS 2/)).toBeTruthy();
  });

  it("does nothing on S before the race starts", () => {
    renderStage();

    fireEvent.keyDown(window, { key: "s" });

    expect(screen.queryByText(/CANVAS 1/)).toBeNull();
  });

  it("leaves S alone in a field, with a modifier, or once defaultPrevented", async () => {
    await startRacing(false);
    const input = document.createElement("input");
    document.body.append(input);

    fireEvent.keyDown(input, { key: "s" });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    fireEvent.keyDown(window, { key: "s", metaKey: true });
    fireEvent.keyDown(window, { key: "s", altKey: true });
    const prevented = new KeyboardEvent("keydown", { key: "s", cancelable: true });
    prevented.preventDefault();
    window.dispatchEvent(prevented);
    input.remove();

    expect(screen.getByText(/CANVAS 0/)).toBeTruthy();
  });

  it("shows the S cap on the skip button, hidden from assistive tech", async () => {
    await startRacing(false);

    const cap = screen.getByRole("button", { name: "Bỏ qua" }).querySelector("kbd");

    expect(cap?.textContent).toBe("S");
    expect(cap?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("RaceStage auto-hide", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** The focus plate wrapper and the exit button, the two things that fade. */
  function chrome() {
    const plate = screen.getByRole("button", { name: "Bỏ qua" }).closest("[data-slot='cat-race-plate']");
    return { plate, exit: screen.getByRole("button", { name: "Thoát toàn màn hình" }) };
  }

  const idle = (element: Element | null) => element?.hasAttribute("data-idle");

  it("hides the plate and the exit button after 2s without a pointer move, and a move brings them back", async () => {
    await startRacing(true);
    const { plate, exit } = chrome();
    expect(idle(plate)).toBe(false);

    act(() => void vi.advanceTimersByTime(1999));
    expect(idle(plate)).toBe(false);
    act(() => void vi.advanceTimersByTime(1));
    expect(idle(plate)).toBe(true);
    expect(idle(exit)).toBe(true);

    act(() => void window.dispatchEvent(new Event("pointermove")));
    expect(idle(plate)).toBe(false);
    expect(idle(exit)).toBe(false);

    act(() => void vi.advanceTimersByTime(2000));
    expect(idle(plate)).toBe(true);
  });

  it("keeps hidden buttons focusable and shows them again when one takes focus", async () => {
    await startRacing(true);
    act(() => void vi.advanceTimersByTime(2000));
    const { plate } = chrome();
    expect(idle(plate)).toBe(true);
    expect(plate?.hasAttribute("inert")).toBe(false);
    expect(plate?.closest("[aria-hidden]")).toBeNull();

    act(() => screen.getByRole("button", { name: "Bỏ qua" }).focus());

    expect(idle(plate)).toBe(false);
  });

  it("never hides outside focus mode", async () => {
    await startRacing(false);

    act(() => void vi.advanceTimersByTime(5000));

    expect(document.querySelector("[data-idle]")).toBeNull();
  });

  it("never hides while the race has not started", () => {
    renderStage(EVENT, PRIZE, true, true);

    act(() => void vi.advanceTimersByTime(5000));

    expect(document.querySelector("[data-idle]")).toBeNull();
  });
});
