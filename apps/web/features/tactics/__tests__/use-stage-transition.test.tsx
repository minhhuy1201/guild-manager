// @vitest-environment jsdom
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import { TRANSITION_MS } from "../lib/stage-transition";
import { useStageTransition } from "../hooks/use-stage-transition";

/** Frame callbacks waiting to run, in the order they were asked for. */
let pending: ((time: number) => void)[] = [];

/** What `performance.now()` answers; a test moves it by hand. */
let now = 0;

beforeEach(() => {
  pending = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
    pending.push(callback);

    return pending.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Move time on and run every frame callback that was waiting.
 * @param ms - How far to move the clock
 */
function advance(ms: number): void {
  now += ms;
  const due = pending;
  pending = [];

  act(() => {
    for (const callback of due) callback(now);
  });
}

/**
 * One stage holding a single token at a known place.
 * @param id - Id of the stage
 * @param x - Where the token stands
 * @returns The stage
 */
function stageAt(id: string, x: number): TacticStage {
  return {
    id,
    name: `Giai đoạn ${id}`,
    elements: [
      {
        kind: "token",
        id: "a",
        label: "Đội 1",
        icon: "swords",
        x,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  };
}

const stages: TacticStage[] = [
  stageAt("s1", 0),
  stageAt("s2", 100),
  stageAt("s3", 300),
];

interface HarnessProps {
  /** False freezes the canvas on the active stage */
  enabled?: boolean;
  /** Whether to ghost the stage before the active one */
  onionSkin?: boolean;
}

/**
 * A screen whose first stage can be edited in place, the way dragging a token edits it.
 * @returns The harness
 */
function EditableHarness() {
  const [edited, setEdited] = useState(stages);
  const [activeStageId, setActiveStageId] = useState("s1");
  const { frame } = useStageTransition(edited, activeStageId, {});

  return (
    <div>
      <button
        type="button"
        onClick={() => setEdited([stageAt("s1", 900), stages[1], stages[2]])}
      >
        drag
      </button>
      <button type="button" onClick={() => setActiveStageId("s2")}>
        Giai đoạn s2
      </button>
      <span data-testid="x">{frame?.tokens[0]?.token.x ?? "none"}</span>
    </div>
  );
}

/**
 * A screen with one button per stage, printing where the token stands and whether it moves.
 * @param props - What to pass the hook
 * @returns The harness
 */
function Harness({ enabled = true, onionSkin = false }: HarnessProps) {
  const [activeStageId, setActiveStageId] = useState("s1");
  const { frame, animating } = useStageTransition(stages, activeStageId, {
    enabled,
    onionSkin,
  });

  return (
    <div>
      {stages.map((stage) => (
        <button
          key={stage.id}
          type="button"
          onClick={() => setActiveStageId(stage.id)}
        >
          {stage.name}
        </button>
      ))}
      <span data-testid="x">{frame?.tokens[0]?.token.x ?? "none"}</span>
      <span data-testid="ghosts">{frame?.ghosts.length ?? 0}</span>
      <span data-testid="animating">{String(animating)}</span>
    </div>
  );
}

/**
 * Where the harness says the token stands.
 * @returns The x coordinate as a number
 */
function tokenX(): number {
  return Number(screen.getByTestId("x").textContent);
}

describe("useStageTransition", () => {
  it("stands still on the first stage", () => {
    render(<Harness />);

    expect(tokenX()).toBe(0);
    expect(screen.getByTestId("animating").textContent).toBe("false");
  });

  it("walks the token to the next stage and stops there", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Giai đoạn s2"));

    expect(screen.getByTestId("animating").textContent).toBe("true");

    advance(TRANSITION_MS / 2);
    expect(tokenX()).toBeGreaterThan(0);
    expect(tokenX()).toBeLessThan(100);

    advance(TRANSITION_MS);
    expect(tokenX()).toBe(100);
    expect(screen.getByTestId("animating").textContent).toBe("false");
  });

  it("runs the move backwards when the stage before is picked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Giai đoạn s2"));
    advance(TRANSITION_MS * 2);

    fireEvent.click(screen.getByText("Giai đoạn s1"));
    advance(TRANSITION_MS / 2);

    expect(tokenX()).toBeLessThan(100);
    expect(tokenX()).toBeGreaterThan(0);

    advance(TRANSITION_MS);
    expect(tokenX()).toBe(0);
  });

  it("carries on from where the token stands when the target changes mid-move", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Giai đoạn s2"));
    advance(TRANSITION_MS / 2);

    const interrupted = tokenX();

    fireEvent.click(screen.getByText("Giai đoạn s3"));

    expect(tokenX()).toBeCloseTo(interrupted, 5);

    advance(TRANSITION_MS);
    expect(tokenX()).toBe(300);
  });

  it("walks from where a token was edited to, not from where its stage was loaded", () => {
    render(<EditableHarness />);
    fireEvent.click(screen.getByText("drag"));
    expect(tokenX()).toBe(900);

    fireEvent.click(screen.getByText("Giai đoạn s2"));

    // The move starts at the dragged position. Starting at 0 would snap the token back first.
    expect(tokenX()).toBe(900);

    advance(TRANSITION_MS * 2);
    expect(tokenX()).toBe(100);
  });

  it("cuts straight to the target while disabled, without asking for a frame", () => {
    render(<Harness enabled={false} />);
    fireEvent.click(screen.getByText("Giai đoạn s2"));

    expect(tokenX()).toBe(100);
    expect(pending).toHaveLength(0);
  });

  it("ghosts the stage before the active one only while standing still", () => {
    render(<Harness onionSkin />);

    expect(screen.getByTestId("ghosts").textContent).toBe("0");

    fireEvent.click(screen.getByText("Giai đoạn s2"));
    expect(screen.getByTestId("ghosts").textContent).toBe("0");

    advance(TRANSITION_MS * 2);
    expect(screen.getByTestId("ghosts").textContent).toBe("1");
  });
});
