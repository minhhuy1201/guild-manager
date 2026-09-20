"use client";

import { useEffect, useState } from "react";
import {
  Arrow,
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Path,
  Stage,
  Text,
} from "react-konva";
import type Konva from "konva";
import { assertNever } from "@guild/shared/lib";
import {
  TACTIC_MAP_HEIGHT,
  TACTIC_MAP_WIDTH,
  type TacticElement,
  type TacticStage,
} from "@guild/shared/schemas";

import type { MapPoint } from "../lib/hit-test";
import { TOKEN_ICON_BOX, TOKEN_ICON_PATHS } from "../lib/icon-paths";
import { stageScale, toMapPoint } from "../lib/stage-scale";
import { COLOR_HEX, TOKEN_RADIUS } from "../lib/token-icon";

/** Where the map picture is served from. Konva loads it with a plain `Image`, not `next/image`. */
const MAP_SRC = "/img/map-guild-war.webp";

/** How wide a drawn element's stroke is relative to the icon box, so icons read at every size. */
const ICON_STROKE_WIDTH = 2;

/** Gap between a token's circle and the label under it, in virtual map units. */
const LABEL_GAP = 6;

/** How much bigger an arrow's head is than its shaft. */
const ARROW_HEAD_RATIO = 4;

/** Font size of a token's label, in virtual map units. */
const LABEL_FONT_SIZE = 22;

export interface TacticStageViewProps {
  /** The stage being drawn */
  stage: TacticStage;
  /** Width the canvas is rendered at, in CSS pixels */
  width: number;
  /** Whether the viewer may change anything */
  readOnly?: boolean;
  /** Element the toolbar is acting on, drawn with a selection ring */
  selectedElementId?: string | null;
  /** Called when a pointer goes down on the map, with map coordinates */
  onPointerDown?: (point: MapPoint) => void;
  /** Called while a pointer moves over the map, with map coordinates */
  onPointerMove?: (point: MapPoint) => void;
  /** Called when the pointer is let go anywhere on the map */
  onPointerUp?: () => void;
  /** Called when a token was dragged to a new place */
  onTokenMoved?: (tokenId: string, x: number, y: number) => void;
  /** Called when an element was clicked */
  onElementClick?: (elementId: string) => void;
  /** Called with the Konva stage once it is mounted, for the image export */
  onStageReady?: (stage: Konva.Stage | null) => void;
}

/**
 * The tactic scene on a Konva stage: the map underneath, the drawing on top.
 *
 * One scale factor drives everything, so a tactic drawn on a wide screen lines up on a narrow one
 * and exports at any pixel ratio. Coordinates handed to the callbacks are already in map space —
 * nothing above this component deals in screen pixels.
 * @param props - The stage to draw and the pointer callbacks
 * @returns The canvas
 */
export function TacticStageView({
  stage,
  width,
  readOnly = false,
  selectedElementId = null,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTokenMoved,
  onElementClick,
  onStageReady,
}: TacticStageViewProps) {
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const scale = stageScale(width);

  useEffect(() => {
    const image = new window.Image();
    image.src = MAP_SRC;
    image.onload = () => setMapImage(image);

    return () => {
      image.onload = null;
    };
  }, []);

  /**
   * Pointer position in map coordinates.
   * @param konvaStage - The stage the event came from
   * @returns The point, or null when the pointer left the stage between the event and this call
   */
  function pointerPoint(konvaStage: Konva.Stage | null): MapPoint | null {
    const pointer = konvaStage?.getPointerPosition();

    return pointer ? toMapPoint(pointer, scale) : null;
  }

  return (
    <Stage
      ref={(node) => onStageReady?.(node)}
      width={TACTIC_MAP_WIDTH * scale}
      height={TACTIC_MAP_HEIGHT * scale}
      scaleX={scale}
      scaleY={scale}
      onMouseDown={(event) => {
        const point = pointerPoint(event.target.getStage());
        if (point) onPointerDown?.(point);
      }}
      onMouseMove={(event) => {
        const point = pointerPoint(event.target.getStage());
        if (point) onPointerMove?.(point);
      }}
      onMouseUp={() => onPointerUp?.()}
      onTouchStart={(event) => {
        const point = pointerPoint(event.target.getStage());
        if (point) onPointerDown?.(point);
      }}
      onTouchMove={(event) => {
        const point = pointerPoint(event.target.getStage());
        if (point) onPointerMove?.(point);
      }}
      onTouchEnd={() => onPointerUp?.()}
    >
      <Layer listening={false}>
        {mapImage ? (
          <KonvaImage
            image={mapImage}
            width={TACTIC_MAP_WIDTH}
            height={TACTIC_MAP_HEIGHT}
          />
        ) : null}
      </Layer>

      <Layer>
        {stage.elements.map((element) => (
          <ElementShape
            key={element.id}
            element={element}
            draggable={!readOnly && element.kind === "token"}
            selected={element.id === selectedElementId}
            onDragEnd={(x, y) => onTokenMoved?.(element.id, x, y)}
            onClick={() => onElementClick?.(element.id)}
          />
        ))}
      </Layer>
    </Stage>
  );
}

interface ElementShapeProps {
  /** The element to draw */
  element: TacticElement;
  /** Whether the element may be dragged */
  draggable: boolean;
  /** Whether to draw the selection ring */
  selected: boolean;
  /** Called with the new map coordinates once a drag ended */
  onDragEnd: (x: number, y: number) => void;
  /** Called when the element was clicked */
  onClick: () => void;
}

/**
 * One element of the scene. Switching on `kind` and ending with `assertNever` is what turns a new
 * element type into a compile error rather than a shape that silently never draws.
 * @param props - The element and its interaction callbacks
 * @returns The Konva shape
 */
function ElementShape({
  element,
  draggable,
  selected,
  onDragEnd,
  onClick,
}: ElementShapeProps) {
  switch (element.kind) {
    case "token": {
      const radius = TOKEN_RADIUS[element.size];
      const iconScale = (radius * 1.1) / TOKEN_ICON_BOX;

      return (
        <Group
          x={element.x}
          y={element.y}
          draggable={draggable}
          onClick={onClick}
          onTap={onClick}
          onDragEnd={(event) => onDragEnd(event.target.x(), event.target.y())}
        >
          <Circle
            radius={radius}
            fill="rgba(12, 14, 18, 0.72)"
            stroke={COLOR_HEX[element.color]}
            strokeWidth={selected ? 6 : 3}
          />
          {TOKEN_ICON_PATHS[element.icon].map((data, index) => (
            <Path
              key={index}
              data={data}
              stroke={COLOR_HEX[element.color]}
              strokeWidth={ICON_STROKE_WIDTH}
              lineCap="round"
              lineJoin="round"
              scaleX={iconScale}
              scaleY={iconScale}
              x={(-TOKEN_ICON_BOX * iconScale) / 2}
              y={(-TOKEN_ICON_BOX * iconScale) / 2}
              listening={false}
            />
          ))}
          <Text
            text={element.label}
            fontSize={LABEL_FONT_SIZE}
            fill="#f5f5f5"
            align="center"
            width={radius * 6}
            x={-radius * 3}
            y={radius + LABEL_GAP}
            listening={false}
          />
        </Group>
      );
    }
    case "arrow":
      return (
        <Arrow
          points={element.points}
          stroke={COLOR_HEX[element.color]}
          fill={COLOR_HEX[element.color]}
          strokeWidth={element.strokeWidth}
          pointerLength={element.strokeWidth * ARROW_HEAD_RATIO}
          pointerWidth={element.strokeWidth * ARROW_HEAD_RATIO}
          lineCap="round"
          onClick={onClick}
          onTap={onClick}
        />
      );
    case "freehand":
      return (
        <Line
          points={element.points}
          stroke={COLOR_HEX[element.color]}
          strokeWidth={element.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          onClick={onClick}
          onTap={onClick}
        />
      );
    case "text":
      return (
        <Text
          x={element.x}
          y={element.y}
          text={element.text}
          fontSize={element.fontSize}
          fontStyle="bold"
          fill={COLOR_HEX[element.color]}
          onClick={onClick}
          onTap={onClick}
        />
      );
    default:
      return assertNever(element);
  }
}
