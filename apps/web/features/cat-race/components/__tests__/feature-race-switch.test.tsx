// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  setFeatured: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  recover: vi.fn(() => false),
}));

vi.mock("../../hooks/use-cat-race-mutations", () => ({
  useSetCatRaceFeatured: () => ({ mutateAsync: m.setFeatured, isPending: false }),
}));
vi.mock("@/components/shared/toast", () => ({
  toastError: m.toastError,
  toastSuccess: m.toastSuccess,
}));
vi.mock("@/hooks/use-session-recovery", () => ({ useSessionRecovery: () => m.recover }));

import { FeatureRaceSwitch } from "../feature-race-switch";
import { ROUND, makeEvent } from "./fixtures";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  m.recover.mockReturnValue(false);
});

const toggle = () => screen.getByRole("switch", { name: "Hiện ở trang chủ" });
const isDisabled = () => toggle().hasAttribute("data-disabled");

describe("FeatureRaceSwitch", () => {
  it("is disabled with the reason while the event is open", () => {
    render(<FeatureRaceSwitch event={makeEvent({ status: "OPEN", rounds: [ROUND] })} />);

    expect(isDisabled()).toBe(true);
    const reason = screen.getByText("Kết thúc đợt trước khi hiện ở trang chủ.");
    expect(reason).toBeTruthy();
    expect(toggle().getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("is disabled with the reason when every round is void", () => {
    const voided = { ...ROUND, voidedAt: "2026-10-12T02:00:00.000Z", voidReason: "nhầm" };
    render(<FeatureRaceSwitch event={makeEvent({ status: "ENDED", rounds: [voided] })} />);

    expect(isDisabled()).toBe(true);
    expect(
      screen.getByText("Đợt chưa có vòng nào còn hiệu lực để hiện ở trang chủ.")
    ).toBeTruthy();
  });

  it("features an ended event with a valid round", async () => {
    m.setFeatured.mockResolvedValue({});
    render(<FeatureRaceSwitch event={makeEvent({ status: "ENDED", rounds: [ROUND] })} />);

    expect(isDisabled()).toBe(false);
    fireEvent.click(toggle());

    await waitFor(() =>
      expect(m.setFeatured).toHaveBeenCalledWith({ id: "e1", featured: true })
    );
    expect(m.toastSuccess).toHaveBeenCalledWith("Đã hiện đợt đua ở trang chủ.");
  });

  it("unfeatures a featured event, even one that could no longer be featured", async () => {
    m.setFeatured.mockResolvedValue({});
    render(<FeatureRaceSwitch event={makeEvent({ status: "ENDED", rounds: [], featured: true })} />);

    expect(isDisabled()).toBe(false);
    fireEvent.click(toggle());

    await waitFor(() =>
      expect(m.setFeatured).toHaveBeenCalledWith({ id: "e1", featured: false })
    );
  });

  it("shows the error the server sent", async () => {
    m.setFeatured.mockRejectedValue(new Error("Đợt chưa kết thúc."));
    render(<FeatureRaceSwitch event={makeEvent({ status: "ENDED", rounds: [ROUND] })} />);

    fireEvent.click(toggle());

    await waitFor(() => expect(m.toastError).toHaveBeenCalledWith("Đợt chưa kết thúc."));
  });
});
