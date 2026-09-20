// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TacticDetail } from "@guild/shared/schemas";

vi.mock("../components/tactic-canvas", () => ({
  TacticCanvas: ({ stage }: { stage: { name: string } }) => (
    <div data-testid="canvas">{stage.name}</div>
  ),
}));

import { TacticViewer } from "../components/tactic-viewer";

afterEach(cleanup);

// jsdom ships no ResizeObserver, and `useStageSize` measures the canvas container with one.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
});

const tactic: TacticDetail = {
  id: "t1",
  name: "Thủ cổng tây",
  description: null,
  stageCount: 2,
  updatedAt: "2026-09-20T10:00:00.000Z",
  scene: {
    schemaVersion: 1,
    stages: [
      { id: "s1", name: "Giai đoạn 1", elements: [] },
      { id: "s2", name: "Giai đoạn 2", elements: [] },
    ],
  },
};

describe("TacticViewer", () => {
  it("opens on the first stage", () => {
    render(<TacticViewer tactic={tactic} />);

    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 1");
  });

  it("switches stage from the tabs", () => {
    render(<TacticViewer tactic={tactic} />);
    fireEvent.click(screen.getByRole("tab", { name: "Giai đoạn 2" }));

    expect(screen.getByTestId("canvas").textContent).toBe("Giai đoạn 2");
  });
});
