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
  }: {
    onFinish: () => void;
    onStandings: (keys: string[]) => void;
    skipSignal: number;
  }) => (
    <div>
      CANVAS {skipSignal}
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

  it("counts tickets in TICKET mode", () => {
    const event = { ...EVENT, mode: CatRaceMode.TICKET };
    event.participants = event.participants.map((p) => ({ ...p, tickets: 3 }));
    renderStage(event);

    expect(screen.getByText("2 người · 6 vé")).toBeTruthy();
  });

  it("says there is no prize and offers a bare ĐUA", () => {
    render(
      <RaceStage
        event={EVENT}
        prize={undefined}
        canEdit
        onEditEntrants={vi.fn()}
        onEditParticipants={vi.fn()}
      />
    );

    expect(screen.getByText("Chưa có hạng mục.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "ĐUA" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the edit dialogs", () => {
    const onEditEntrants = vi.fn();
    const onEditParticipants = vi.fn();
    render(
      <RaceStage
        event={EVENT}
        prize={PRIZE}
        canEdit
        onEditEntrants={onEditEntrants}
        onEditParticipants={onEditParticipants}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Danh sách đua/ }));
    fireEvent.click(screen.getByRole("button", { name: /Người tham gia/ }));

    expect(onEditEntrants).toHaveBeenCalled();
    expect(onEditParticipants).toHaveBeenCalled();
  });

  it("starts from the saved duration and stores a valid change", () => {
    useRaceStore.setState({ durationSeconds: 20 });
    renderStage();
    const field = screen.getByLabelText("Thời gian đua (giây)") as HTMLInputElement;
    expect(field.value).toBe("20");

    fireEvent.change(field, { target: { value: "35" } });

    expect(useRaceStore.getState().durationSeconds).toBe(35);
    expect(screen.queryByText(/Nhập số giây nguyên/)).toBeNull();
  });

  it.each(["9", "41", "12.5", ""])(
    "rejects %j: says why, keeps the stored duration and locks ĐUA",
    (typed) => {
      useRaceStore.setState({ durationSeconds: 20 });
      renderStage();

      fireEvent.change(screen.getByLabelText("Thời gian đua (giây)"), { target: { value: typed } });

      expect(screen.getByText("Nhập số giây nguyên từ 10 đến 40.")).toBeTruthy();
      expect(useRaceStore.getState().durationSeconds).toBe(20);
      expect((screen.getByRole("button", { name: /ĐUA/ }) as HTMLButtonElement).disabled).toBe(true);
    }
  );

  it("locks the duration field while a round runs", async () => {
    mutateAsync.mockResolvedValue(RESULT);
    renderStage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /ĐUA/ }));
    });

    expect((screen.getByLabelText("Thời gian đua (giây)") as HTMLInputElement).disabled).toBe(true);
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

  it("hides the edit buttons for a read-only event", () => {
    render(
      <RaceStage
        event={EVENT}
        prize={PRIZE}
        canEdit={false}
        onEditEntrants={vi.fn()}
        onEditParticipants={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Danh sách đua/ })).toBeNull();
  });
});
