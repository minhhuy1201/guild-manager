// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";
import type { TacticStage } from "@guild/shared/schemas";

/**
 * Stand-in for a Konva node: renders a div carrying the props a test asserts on.
 * @param slot - Name of the Konva component
 * @returns A component rendering that node as a div
 */
function konvaNode(slot: string) {
  return function Node(props: Record<string, unknown>) {
    const { children, ...rest } = props as { children?: React.ReactNode };

    return (
      <div
        data-slot={slot}
        data-props={JSON.stringify(rest, (_key, value) =>
          typeof value === "function" ? undefined : value
        )}
      >
        {children}
      </div>
    );
  };
}

vi.mock("react-konva", () => ({
  Stage: konvaNode("stage"),
  Layer: konvaNode("layer"),
  Image: konvaNode("image"),
  Group: konvaNode("group"),
  Circle: konvaNode("circle"),
  Line: konvaNode("line"),
  Arrow: konvaNode("arrow"),
  Path: konvaNode("path"),
  Text: konvaNode("text"),
}));

import { TacticStageView } from "../components/tactic-stage-view";

afterEach(cleanup);

const stage: TacticStage = {
  id: "s1",
  name: "Giai đoạn 1",
  elements: [
    {
      kind: "token",
      id: "tk1",
      label: "Đội công",
      icon: "swords",
      x: 100,
      y: 100,
      size: "md",
      color: "red",
    },
  ],
};

/**
 * The props the mocked Stage was rendered with.
 * @returns The Stage props
 */
function stageProps(): Record<string, number> {
  const node = screen.getAllByText("", { selector: '[data-slot="stage"]' })[0];

  return JSON.parse(node.getAttribute("data-props") ?? "{}") as Record<
    string,
    number
  >;
}

describe("TacticStageView", () => {
  it("fills the width it is given and keeps the map's aspect ratio", () => {
    render(<TacticStageView stage={stage} width={960} />);

    const props = stageProps();
    expect(props.width).toBe(960);
    expect(props.height).toBeCloseTo(TACTIC_MAP_HEIGHT * (960 / TACTIC_MAP_WIDTH));
    expect(props.scaleX).toBeCloseTo(960 / TACTIC_MAP_WIDTH);
  });

  it("multiplies the fit scale by the zoom and takes its offset", () => {
    render(
      <TacticStageView
        stage={stage}
        width={960}
        zoom={{ zoom: 2, offset: { x: -30, y: -40 } }}
      />
    );

    const props = stageProps();
    expect(props.scaleX).toBeCloseTo((960 / TACTIC_MAP_WIDTH) * 2);
    expect(props.width).toBe(960);
    expect(props.x).toBe(-30);
    expect(props.y).toBe(-40);
  });

  it("draws a token as a circle with its icon and label", () => {
    render(<TacticStageView stage={stage} width={960} />);

    expect(document.querySelector('[data-slot="circle"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-slot="path"]').length).toBeGreaterThan(0);
    expect(
      document.querySelector('[data-slot="text"]')?.getAttribute("data-props")
    ).toContain("Đội công");
  });
});
