// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
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
  Rect: konvaNode("rect"),
}));

import { staticFrame, transitionFrame } from "../lib/stage-transition";
import { TacticStageView } from "../components/tactic-stage-view";

afterEach(() => {
  cleanup();
  rendered.clear();
});

/**
 * A mouse event as Konva reports it, with the pointer at a known place on the stage.
 * @param button - Which button is down; 0 draws, 1 pans
 * @param pointer - Pointer position on the stage, in canvas pixels
 * @param shiftKey - Whether Shift is held
 * @returns The event object the handlers read
 */
function mouseEvent(
  button: number,
  pointer: { x: number; y: number },
  shiftKey = false
) {
  return {
    evt: {
      button,
      shiftKey,
      clientX: pointer.x,
      clientY: pointer.y,
      preventDefault: () => {},
    },
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
      color: "black",
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
    render(<TacticStageView frame={staticFrame(stage)} width={960} />);

    const props = stageProps();
    expect(props.width).toBe(960);
    expect(props.height).toBeCloseTo(TACTIC_MAP_HEIGHT * (960 / TACTIC_MAP_WIDTH));
    expect(props.scaleX).toBeCloseTo(960 / TACTIC_MAP_WIDTH);
  });

  it("multiplies the fit scale by the zoom and takes its offset", () => {
    render(
      <TacticStageView
        frame={staticFrame(stage)}
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

  it("draws nothing at all before the canvas box has been measured", () => {
    const { container } = render(<TacticStageView frame={staticFrame(stage)} width={0} />);

    expect(container.firstChild).toBeNull();
  });

  it("draws an arrow, a freehand stroke and a note, each in its own colour", () => {
    render(<TacticStageView frame={staticFrame(busyStage)} width={960} />);

    expect(propsOf("arrow").stroke).toBe("#3b82f6");
    expect(propsOf("line").stroke).toBe("#f5c518");
    expect(propsOf("text").fill).toBe("#101114");
    expect(propsOf("text").text).toBe("Tập kết");
  });

  it("draws a numbered team as its digits rather than as artwork", () => {
    const numbered: TacticStage = {
      id: "s3",
      name: "Giai đoạn 3",
      elements: [
        {
          kind: "token",
          id: "tk2",
          label: "Đội 7",
          icon: "number-7",
          x: 40,
          y: 40,
          size: "md",
          color: "blue",
        },
      ],
    };

    render(<TacticStageView frame={staticFrame(numbered)} width={960} />);

    expect(document.querySelector('[data-slot="path"]')).toBeNull();
    expect(propsOf("text").text).toBe("7");
  });

  it.each([
    ["number-3", "#6fb59d"],
    ["number-6", "#c2bdb7"],
    ["number-8", "#6c84c3"],
    ["number-10", "#d4b278"],
  ] as const)(
    "rings team token %s in its team builder colour, leaving the digits in the toolbar's",
    (icon, border) => {
      const team: TacticStage = {
        ...stage,
        elements: [
          { ...stage.elements[0], icon, color: "red" } as TacticStage["elements"][number],
        ],
      };

      render(<TacticStageView frame={staticFrame(team)} width={960} />);

      expect(propsOf("circle").stroke).toBe(border);
      expect(propsOf("text").fill).toBe("#e5484d");
    }
  );

  it("rings any other token in the toolbar's colour", () => {
    render(<TacticStageView frame={staticFrame(stage)} width={960} />);

    expect(propsOf("circle").stroke).toBe("#e5484d");
  });

  it("puts a black token on a light disc, so its icon stays readable", () => {
    const black: TacticStage = {
      ...stage,
      elements: [{ ...stage.elements[0], color: "black" }],
    };

    render(<TacticStageView frame={staticFrame(black)} width={960} />);

    expect(propsOf("circle").fill).toBe("rgba(244, 244, 245, 0.86)");
  });

  it("thickens the selected token's ring", () => {
    render(<TacticStageView frame={staticFrame(stage)} width={960} />);
    const plain = propsOf("circle").strokeWidth;

    cleanup();
    render(
      <TacticStageView frame={staticFrame(stage)} width={960} selectedElementIds={["tk1"]} />
    );

    expect(propsOf("circle").strokeWidth).toBeGreaterThan(Number(plain));
  });

  it("hands pointer positions up in map coordinates, zoom and pan removed", () => {
    const onPointerDown = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn();
    render(
      <TacticStageView
        frame={staticFrame(stage)}
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
    expect(onPointerDown).toHaveBeenCalledWith({ x: 100, y: 100 }, { shift: false });

    props.onMouseDown(mouseEvent(0, { x: 200, y: 150 }, true));
    expect(onPointerDown).toHaveBeenLastCalledWith({ x: 100, y: 100 }, { shift: true });

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
        frame={staticFrame(stage)}
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

  it("draws the marquee being dragged out, and nothing when there is none", () => {
    render(<TacticStageView frame={staticFrame(stage)} width={960} />);
    expect(rendered.get("rect") ?? []).toHaveLength(0);

    cleanup();
    render(
      <TacticStageView
        frame={staticFrame(stage)}
        width={960}
        marquee={{ left: 10, top: 20, right: 110, bottom: 220 }}
      />
    );

    expect(propsOf("rect")).toMatchObject({ x: 10, y: 20, width: 100, height: 200 });
  });

  it("boxes a selected stroke or note, which have no ring of their own", () => {
    render(
      <TacticStageView
        frame={staticFrame(busyStage)}
        width={960}
        selectedElementIds={["a1", "x1"]}
      />
    );

    expect(rendered.get("rect") ?? []).toHaveLength(2);
    expect(propsOf("rect")).toMatchObject({ x: 0, y: 0, width: 100, height: 100 });
  });

  it("boxes no selected token: its thick ring already says so", () => {
    render(
      <TacticStageView frame={staticFrame(stage)} width={960} selectedElementIds={["tk1"]} />
    );

    expect(rendered.get("rect") ?? []).toHaveLength(0);
  });

  it("puts a halo under the token the pointer is on, and takes it away again", () => {
    const container = document.createElement("div");
    const hoverEvent = {
      target: { getStage: () => ({ container: () => container }) },
    };

    const { rerender } = render(
      <TacticStageView frame={staticFrame(stage)} width={960} />
    );

    const group = (rendered.get("group") ?? []).at(-1) as unknown as {
      onMouseEnter: (event: unknown) => void;
      onMouseLeave: (event: unknown) => void;
    };

    expect(document.querySelectorAll('[data-slot="circle"]').length).toBe(1);

    act(() => group.onMouseEnter(hoverEvent));
    rerender(<TacticStageView frame={staticFrame(stage)} width={960} />);

    // The halo is a second circle behind the token's own, in the token's colour.
    expect(document.querySelectorAll('[data-slot="circle"]').length).toBe(2);
    expect(container.style.cursor).toBe("grab");

    act(() => group.onMouseLeave(hoverEvent));
    rerender(<TacticStageView frame={staticFrame(stage)} width={960} />);

    expect(document.querySelectorAll('[data-slot="circle"]').length).toBe(1);
    expect(container.style.cursor).toBe("");
  });

  it("offers no grab cursor on a canvas that cannot be written", () => {
    const container = document.createElement("div");
    render(<TacticStageView frame={staticFrame(stage)} width={960} readOnly />);

    const group = (rendered.get("group") ?? []).at(-1) as unknown as {
      onMouseEnter: (event: unknown) => void;
    };
    act(() =>
      group.onMouseEnter({ target: { getStage: () => ({ container: () => container }) } })
    );

    expect(container.style.cursor).toBe("");
  });

  it("draws a token as a circle with its icon and label", () => {
    render(<TacticStageView frame={staticFrame(stage)} width={960} />);

    expect(document.querySelector('[data-slot="circle"]')).not.toBeNull();
    expect(document.querySelectorAll('[data-slot="path"]').length).toBeGreaterThan(0);
    expect(
      document.querySelector('[data-slot="text"]')?.getAttribute("data-props")
    ).toContain("Đội công");
  });
});

describe("a frame in motion", () => {
  const from: TacticStage = {
    id: "s1",
    name: "Giai đoạn 1",
    elements: [
      {
        kind: "token",
        id: "a",
        label: "Đội 1",
        icon: "swords",
        x: 0,
        y: 0,
        size: "md",
        color: "red",
      },
    ],
  };
  const to: TacticStage = {
    ...from,
    id: "s2",
    elements: [{ ...from.elements[0], id: "a", x: 100 } as TacticStage["elements"][number]],
  };

  it("draws a trail behind a moving token", () => {
    render(
      <TacticStageView
        frame={transitionFrame(from, to, 0.5)}
        width={960}
        animating
      />
    );

    const trail = (rendered.get("line") ?? []).find(
      (props) => props.opacity !== undefined
    );

    expect(trail?.points).toEqual([0, 0, 50, 0]);
  });

  it("draws a team token's trail in its ring colour", () => {
    const teamFrom: TacticStage = {
      ...from,
      elements: [{ ...from.elements[0], icon: "number-9" } as TacticStage["elements"][number]],
    };
    const teamTo: TacticStage = {
      ...to,
      elements: [{ ...teamFrom.elements[0], x: 100 } as TacticStage["elements"][number]],
    };

    render(
      <TacticStageView
        frame={transitionFrame(teamFrom, teamTo, 0.5)}
        width={960}
        animating
      />
    );

    const trail = (rendered.get("line") ?? []).find(
      (props) => props.opacity !== undefined
    );

    expect(trail?.stroke).toBe("#d4b278");
  });

  it("draws no trail while standing still", () => {
    render(<TacticStageView frame={staticFrame(from)} width={960} />);

    expect(rendered.get("line") ?? []).toHaveLength(0);
  });

  it("draws the onion skin faintly", () => {
    render(<TacticStageView frame={staticFrame(to, from)} width={960} />);

    const faint = (rendered.get("group") ?? []).filter(
      (props) => (props.opacity as number) < 1
    );

    expect(faint).toHaveLength(1);
  });

  it("ignores a press while the stage change runs, so nothing is picked up mid-flight", () => {
    const onPointerDown = vi.fn();
    render(
      <TacticStageView
        frame={transitionFrame(from, to, 0.5)}
        width={960}
        animating
        onPointerDown={onPointerDown}
      />
    );

    const props = stageProps() as unknown as {
      onMouseDown: (event: unknown) => void;
    };
    props.onMouseDown(mouseEvent(0, { x: 10, y: 10 }));

    expect(onPointerDown).not.toHaveBeenCalled();
  });
});
