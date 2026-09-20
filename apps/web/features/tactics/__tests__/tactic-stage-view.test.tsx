// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TACTIC_MAP_HEIGHT, TACTIC_MAP_WIDTH } from "@guild/shared/schemas";
import type { TacticStage } from "@guild/shared/schemas";

/**
 * Props every mocked Konva node was rendered with, newest last, keyed by node name.
 * Serialising to an attribute would drop the handlers, and the handlers are where the pointer
 * conversion lives.
 */
const rendered = new Map<string, Record<string, unknown>[]>();

/**
 * Stand-in for a Konva node: records its props and renders a div in its place.
 * @param slot - Name of the Konva component
 * @returns A component rendering that node as a div
 */
function konvaNode(slot: string) {
  return function Node(props: Record<string, unknown>) {
    const { children, ...rest } = props as { children?: React.ReactNode };

    rendered.set(slot, [...(rendered.get(slot) ?? []), rest]);

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

afterEach(() => {
  cleanup();
  rendered.clear();
});

/**
 * A mouse event as Konva reports it, with the pointer at a known place on the stage.
 * @param button - Which button is down; 0 draws, 1 pans
 * @param pointer - Pointer position on the stage, in canvas pixels
 * @returns The event object the handlers read
 */
function mouseEvent(button: number, pointer: { x: number; y: number }) {
  return {
    evt: { button, clientX: pointer.x, clientY: pointer.y, preventDefault: () => {} },
    target: { getStage: () => ({ getPointerPosition: () => pointer }) },
  };
}

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
 * The props the mocked Stage was rendered with, handlers included.
 * @returns The Stage props
 */
function stageProps(): Record<string, never> {
  const calls = rendered.get("stage") ?? [];

  return (calls.at(-1) ?? {}) as Record<string, never>;
}

/** Every element kind on one stage, so each render branch is exercised. */
const busyStage: TacticStage = {
  id: "s2",
  name: "Giai đoạn 2",
  elements: [
    {
      kind: "arrow",
      id: "a1",
      points: [0, 0, 100, 100],
      color: "blue",
      strokeWidth: 8,
    },
    {
      kind: "freehand",
      id: "f1",
      points: [0, 0, 5, 5, 9, 9],
      color: "yellow",
      strokeWidth: 2,
    },
    {
      kind: "text",
      id: "x1",
      x: 40,
      y: 50,
      text: "Tập kết",
      color: "white",
      fontSize: 28,
    },
  ],
};

/**
 * The props one mocked Konva node was rendered with.
 * @param slot - Which node to read
 * @returns Its props
 */
function propsOf(slot: string): Record<string, unknown> {
  const node = document.querySelector(`[data-slot="${slot}"]`);

  return JSON.parse(node?.getAttribute("data-props") ?? "{}") as Record<
    string,
    unknown
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

  it("draws an arrow, a freehand stroke and a note, each in its own colour", () => {
    render(<TacticStageView stage={busyStage} width={960} />);

    expect(propsOf("arrow").stroke).toBe("#3b82f6");
    expect(propsOf("line").stroke).toBe("#f5c518");
    expect(propsOf("text").fill).toBe("#f5f5f5");
    expect(propsOf("text").text).toBe("Tập kết");
  });

  it("lets a token be dragged only while the canvas is writable", () => {
    render(<TacticStageView stage={stage} width={960} />);
    expect(propsOf("group").draggable).toBe(true);

    cleanup();
    render(<TacticStageView stage={stage} width={960} readOnly />);
    expect(propsOf("group").draggable).toBe(false);
  });

  it("thickens the selected token's ring", () => {
    render(<TacticStageView stage={stage} width={960} />);
    const plain = propsOf("circle").strokeWidth;

    cleanup();
    render(
      <TacticStageView stage={stage} width={960} selectedElementId="tk1" />
    );

    expect(propsOf("circle").strokeWidth).toBeGreaterThan(Number(plain));
  });

  it("hands pointer positions up in map coordinates, zoom and pan removed", () => {
    const onPointerDown = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn();
    render(
      <TacticStageView
        stage={stage}
        width={TACTIC_MAP_WIDTH / 2}
        zoom={{ zoom: 2, offset: { x: 100, y: 50 } }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    );

    const props = stageProps() as unknown as {
      onMouseDown: (event: unknown) => void;
      onMouseMove: (event: unknown) => void;
      onMouseUp: () => void;
    };

    // Fit scale is 0.5 at half the map's width, doubled by the zoom: a pointer 200px right of the
    // 100px offset sits 100 map units in.
    props.onMouseDown(mouseEvent(0, { x: 200, y: 150 }));
    expect(onPointerDown).toHaveBeenCalledWith({ x: 100, y: 100 });

    props.onMouseMove(mouseEvent(0, { x: 200, y: 150 }));
    expect(onPointerMove).toHaveBeenCalledWith({ x: 100, y: 100 });

    props.onMouseUp();
    expect(onPointerUp).toHaveBeenCalled();
  });

  it("leaves drawing to the primary button, so the middle one can pan", () => {
    const onPointerDown = vi.fn();
    const onStageMouseDown = vi.fn();
    render(
      <TacticStageView
        stage={stage}
        width={960}
        onPointerDown={onPointerDown}
        onStageMouseDown={onStageMouseDown}
      />
    );

    const props = stageProps() as unknown as {
      onMouseDown: (event: unknown) => void;
    };

    props.onMouseDown(mouseEvent(1, { x: 10, y: 10 }));

    expect(onStageMouseDown).toHaveBeenCalled();
    expect(onPointerDown).not.toHaveBeenCalled();
  });

  it("reports a token's drag in map coordinates, and a click on an element", () => {
    const onTokenMoved = vi.fn();
    const onElementClick = vi.fn();
    render(
      <TacticStageView
        stage={stage}
        width={960}
        onTokenMoved={onTokenMoved}
        onElementClick={onElementClick}
      />
    );

    const group = (rendered.get("group") ?? []).at(-1) as unknown as {
      onDragEnd: (event: unknown) => void;
      onClick: () => void;
    };

    group.onDragEnd({ target: { x: () => 300, y: () => 400 } });
    expect(onTokenMoved).toHaveBeenCalledWith("tk1", 300, 400);

    group.onClick();
    expect(onElementClick).toHaveBeenCalledWith("tk1");
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
