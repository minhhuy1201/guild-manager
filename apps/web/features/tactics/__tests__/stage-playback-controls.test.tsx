// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StagePlaybackControls } from "../components/stage-playback-controls";

afterEach(cleanup);

describe("StagePlaybackControls", () => {
  it("offers to play while stopped, and to pause while playing", () => {
    const { rerender } = render(
      <StagePlaybackControls
        playing={false}
        onionSkin={false}
        disabled={false}
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(
      screen.getByRole("button", { name: "Chạy các giai đoạn" })
    ).not.toBeNull();

    rerender(
      <StagePlaybackControls
        playing
        onionSkin={false}
        disabled={false}
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Dừng" })).not.toBeNull();
  });

  it("says whether the onion skin is on", () => {
    render(
      <StagePlaybackControls
        playing={false}
        onionSkin
        disabled={false}
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(
      screen
        .getByRole("button", { name: "Bóng mờ giai đoạn trước" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });

  it("reports both presses", () => {
    const onTogglePlay = vi.fn();
    const onToggleOnionSkin = vi.fn();

    render(
      <StagePlaybackControls
        playing={false}
        onionSkin={false}
        disabled={false}
        onTogglePlay={onTogglePlay}
        onToggleOnionSkin={onToggleOnionSkin}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Chạy các giai đoạn" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Bóng mờ giai đoạn trước" })
    );

    expect(onTogglePlay).toHaveBeenCalledOnce();
    expect(onToggleOnionSkin).toHaveBeenCalledOnce();
  });

  it("switches both buttons off when there is only one stage", () => {
    render(
      <StagePlaybackControls
        playing={false}
        onionSkin={false}
        disabled
        onTogglePlay={() => {}}
        onToggleOnionSkin={() => {}}
      />
    );

    expect(
      screen
        .getByRole("button", { name: "Chạy các giai đoạn" })
        .hasAttribute("disabled")
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Bóng mờ giai đoạn trước" })
        .hasAttribute("disabled")
    ).toBe(true);
  });
});
