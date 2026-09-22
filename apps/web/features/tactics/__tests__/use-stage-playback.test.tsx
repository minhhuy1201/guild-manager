// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import {
  PLAYBACK_DWELL_MS,
  useStagePlayback,
} from "../hooks/use-stage-playback";

beforeEach(() => vi.useFakeTimers());

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const stages: TacticStage[] = [
  { id: "s1", name: "Giai đoạn 1", elements: [] },
  { id: "s2", name: "Giai đoạn 2", elements: [] },
  { id: "s3", name: "Giai đoạn 3", elements: [] },
];

/**
 * A screen with a play button, printing which stage is open.
 * @returns The harness
 */
function Harness() {
  const [activeStageId, setActiveStageId] = useState("s1");
  const playback = useStagePlayback(
    stages,
    activeStageId,
    false,
    setActiveStageId
  );

  return (
    <div>
      <button type="button" onClick={playback.toggle}>
        play
      </button>
      <button type="button" onClick={playback.stop}>
        stop
      </button>
      <span data-testid="stage">{activeStageId}</span>
      <span data-testid="playing">{String(playback.playing)}</span>
    </div>
  );
}

/** Let the dwell timer fire once. */
function dwell(): void {
  act(() => {
    vi.advanceTimersByTime(PLAYBACK_DWELL_MS);
  });
}

/**
 * Which stage the harness says is open.
 * @returns The stage id
 */
function openStage(): string | null {
  return screen.getByTestId("stage").textContent;
}

describe("useStagePlayback", () => {
  it("walks the stages one at a time", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));

    dwell();
    expect(openStage()).toBe("s2");

    dwell();
    expect(openStage()).toBe("s3");
  });

  it("stops on the last stage rather than looping", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));
    dwell();
    dwell();
    dwell();

    expect(openStage()).toBe("s3");
    expect(screen.getByTestId("playing").textContent).toBe("false");
  });

  it("starts over from the first stage when the last one is already open", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));
    dwell();
    dwell();
    dwell();

    fireEvent.click(screen.getByText("play"));
    expect(openStage()).toBe("s1");

    dwell();
    expect(openStage()).toBe("s2");
  });

  it("hands the stages back when something stops it", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("play"));
    fireEvent.click(screen.getByText("stop"));

    dwell();
    expect(openStage()).toBe("s1");
    expect(screen.getByTestId("playing").textContent).toBe("false");
  });
});
