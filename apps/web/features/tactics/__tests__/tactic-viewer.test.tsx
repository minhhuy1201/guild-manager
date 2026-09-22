// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TacticStage } from "@guild/shared/schemas";

import type { StageFrame } from "../lib/stage-transition";

vi.mock("../components/tactic-canvas", () => ({
  TacticCanvas: ({ frame }: { frame: StageFrame }) => (
    <div data-testid="canvas">{frame.tokens[0]?.token.label}</div>
  ),
}));

import { TacticViewer } from "../components/tactic-viewer";

afterEach(cleanup);

// jsdom ships neither ResizeObserver, which `useStageSize` measures the canvas container with, nor
// matchMedia, which `useReducedMotion` reads. Nothing here turns animation off, so the media query
// answers no.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

/**
 * A stage carrying one token named after it, so the mocked canvas can say which stage it drew.
 * @param id - Id of the stage
 * @param name - Name of the stage, which the token repeats
 * @returns The stage
 */
function stageNamed(id: string, name: string): TacticStage {
  return {
    id,
    name,
    elements: [
      {
        kind: "token",
        id: "a",
        label: name,
        icon: "swords",
        x: 0,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  };
}

const stages: TacticStage[] = [
  stageNamed("s1", "Giai đoạn 1"),
  stageNamed("s2", "Giai đoạn 2"),
];

describe("TacticViewer", () => {
  it("opens on the first stage", () => {
    render(<TacticViewer stages={stages} />);

    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 1");
  });

  it("switches stage from the tabs", () => {
    render(<TacticViewer stages={stages} />);
    fireEvent.click(screen.getByRole("tab", { name: "Giai đoạn 2" }));

    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 2");
  });

  it("walks the stages with the arrow keys", () => {
    render(<TacticViewer stages={stages} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 2");

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 1");
  });

  it("stops at both ends rather than wrapping around", () => {
    render(<TacticViewer stages={stages} />);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 1");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 2");
  });

  it("hides the tabs and the arrow hint for a single stage", () => {
    render(<TacticViewer stages={[stages[0]]} />);

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByText("→")).toBeNull();
  });

  it("offers the play and onion-skin buttons once there are two stages", () => {
    render(<TacticViewer stages={stages} />);

    expect(
      screen.getByRole("button", { name: "Chạy các giai đoạn" })
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Bóng mờ giai đoạn trước" })
    ).not.toBeNull();
  });

  it("keeps both buttons off a one-stage tactic", () => {
    render(<TacticViewer stages={[stages[0]]} />);

    expect(
      screen.queryByRole("button", { name: "Chạy các giai đoạn" })
    ).toBeNull();
  });
});
