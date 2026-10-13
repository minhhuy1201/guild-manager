// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  announce: vi.fn(),
  endRace: vi.fn(),
  voidRound: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  recover: vi.fn(() => false),
  pending: { announce: false },
}));

vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useAnnounceCatRace: () => ({ mutateAsync: m.announce, isPending: m.pending.announce }),
  useEndCatRace: () => ({ mutateAsync: m.endRace }),
  useVoidCatRaceRound: () => ({ mutateAsync: m.voidRound }),
}));
vi.mock("@/components/shared/toast", () => ({
  toastError: m.toastError,
  toastSuccess: m.toastSuccess,
}));
vi.mock("@/hooks/use-session-recovery", () => ({
  useSessionRecovery: () => m.recover,
}));

import { AnnounceButton } from "../announce-button";
import { ChoiceButtons } from "../choice-buttons";
import { EndEventButton } from "../end-event-button";
import { VoidRoundDialog } from "../void-round-dialog";
import { ROUND } from "./fixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  m.pending.announce = false;
  m.recover.mockReturnValue(false);
});

describe("AnnounceButton", () => {
  it("posts and confirms", async () => {
    m.announce.mockResolvedValue({});
    render(<AnnounceButton eventId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: /Đăng tổng kết/ }));

    await waitFor(() => expect(m.toastSuccess).toHaveBeenCalled());
    expect(m.announce).toHaveBeenCalledWith("e1");
  });

  it("shows the error the server sent", async () => {
    m.announce.mockRejectedValue(new Error("Kênh chưa cấu hình."));
    render(<AnnounceButton eventId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: /Đăng tổng kết/ }));

    await waitFor(() => expect(m.toastError).toHaveBeenCalledWith("Kênh chưa cấu hình."));
  });

  it("stays silent when the session recovery took over", async () => {
    m.announce.mockRejectedValue(new Error("401"));
    m.recover.mockReturnValue(true);
    render(<AnnounceButton eventId="e1" />);

    fireEvent.click(screen.getByRole("button", { name: /Đăng tổng kết/ }));

    await waitFor(() => expect(m.announce).toHaveBeenCalled());
    expect(m.toastError).not.toHaveBeenCalled();
  });

  it("locks while posting", () => {
    m.pending.announce = true;
    render(<AnnounceButton eventId="e1" />);

    expect(
      (screen.getByRole("button", { name: /Đăng tổng kết/ }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});

describe("EndEventButton", () => {
  it("asks first, then ends the event", async () => {
    m.endRace.mockResolvedValue({});
    render(<EndEventButton eventId="e1" />);

    expect(screen.queryByText("Kết thúc đợt quay?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Kết thúc đợt/ }));
    expect(screen.getByText("Kết thúc đợt quay?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kết thúc" }));

    await waitFor(() => expect(m.endRace).toHaveBeenCalledWith("e1"));
  });
});

describe("VoidRoundDialog", () => {
  it("renders nothing without a round", () => {
    render(<VoidRoundDialog eventId="e1" round={null} onOpenChange={vi.fn()} />);

    expect(screen.queryByText("Huỷ vòng")).toBeNull();
  });

  it("sends the typed reason and closes", async () => {
    m.voidRound.mockResolvedValue({});
    const onOpenChange = vi.fn();
    render(<VoidRoundDialog eventId="e1" round={ROUND} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("Lý do"), { target: { value: "nhầm" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Huỷ vòng" }).at(-1)!);

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(m.voidRound).toHaveBeenCalledWith({ id: "e1", roundId: "r1", reason: "nhầm" });
  });

  it("cancels without writing", () => {
    const onOpenChange = vi.fn();
    render(<VoidRoundDialog eventId="e1" round={ROUND} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole("button", { name: /^Huỷ$/ }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(m.voidRound).not.toHaveBeenCalled();
  });
});

describe("ChoiceButtons", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ] as const;

  it("marks the selected option and reports a pick", () => {
    const onChange = vi.fn();
    render(<ChoiceButtons label="Chọn" value="a" options={options} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "A" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "B" }));

    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("locks every option when disabled", () => {
    render(<ChoiceButtons label="Chọn" value="a" options={options} onChange={vi.fn()} disabled />);

    expect((screen.getByRole("button", { name: "B" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
