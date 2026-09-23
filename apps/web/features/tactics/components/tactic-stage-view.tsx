"use client";

import { useEffect, useRef, useState } from "react";
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
import type { TacticTokenIcon } from "@guild/shared/enums";
import { assertNever } from "@guild/shared/lib";
import {
  TACTIC_MAP_HEIGHT,
  TACTIC_MAP_WIDTH,
  type TacticElement,
} from "@guild/shared/schemas";

import type { MapPoint } from "../lib/element-geometry";
import { TRAIL_OPACITY, type StageFrame } from "../lib/stage-transition";
import { INITIAL_ZOOM, type ZoomState } from "../lib/zoom";
import { TOKEN_ICON_BOX } from "../lib/icon-paths";
import { stageScale, toMapPoint } from "../lib/stage-scale";
import {
  COLOR_HEX,
  TOKEN_FILL,
  TOKEN_LABEL_FONT_SIZE,
  TOKEN_LABEL_GAP,
  TOKEN_RADIUS,
  tokenBorderHex,
  tokenIcon,
} from "../lib/token-icon";

/** Where the map picture is served from. Konva loads it with a plain `Image`, not `next/image`. */
const MAP_SRC = "/img/map-guild-war.webp";

/** How wide a drawn element's stroke is relative to the icon box, so icons read at every size. */
const ICON_STROKE_WIDTH = 2;

/** The mouse button that draws. The middle one pans instead. */
const PRIMARY_MOUSE_BUTTON = 0;

/** How much bigger an arrow's head is than its shaft. */
const ARROW_HEAD_RATIO = 4;

/** How tall a numbered token's digits are drawn, relative to the token's radius. */
const DIGIT_FONT_RATIO = 1.15;

/** How far a hovered token's halo reaches past its circle, as a multiple of the radius. */
const HOVER_HALO_RATIO = 1.28;

/** How solid that halo is. Enough to pick the token out, not enough to hide the map under it. */
const HOVER_HALO_OPACITY = 0.3;

/** How wide the line a moving token drags behind it is, in map units. */
const TRAIL_STROKE_WIDTH = 3;

export interface TacticStageViewProps {
  /** The frame being drawn: a stage standing still, or a moment part way between two */
  frame: StageFrame;
  /** Whether a stage change is running, which is when a token must not be dragged */
  animating?: boolean;
  /** Width the canvas is rendered at, in CSS pixels */
  width: number;
  /** Whether the viewer may change anything */
  readOnly?: boolean;
  /** Element the toolbar is acting on, drawn with a selection ring */
  selectedElementId?: string | null;
  /** Height the canvas is rendered at, in CSS pixels; defaults to the map's own aspect ratio */
  height?: number;
  /** How far the map is zoomed in and how far it has been pushed */
  zoom?: ZoomState;
  /** Called when a pointer goes down on the map, with map coordinates */
  onPointerDown?: (point: MapPoint) => void;
  /** Called while a pointer moves over the map, with map coordinates */
  onPointerMove?: (point: MapPoint) => void;
  /** Called when the pointer is let go anywhere on the map */
  onPointerUp?: () => void;
  /** Called when a token starts being dragged */
  onTokenDragStart?: (tokenId: string) => void;
  /** Called when a token was dragged to a new place */
  onTokenMoved?: (tokenId: string, x: number, y: number) => void;
  /** Called when an element was clicked */
  onElementClick?: (elementId: string) => void;
  /** Called with the Konva stage once it is mounted, for the image export */
  onStageReady?: (stage: Konva.Stage | null) => void;
  /** Wheel handler, for zooming around the pointer */
  onWheel?: (event: Konva.KonvaEventObject<WheelEvent>) => void;
  /** Mouse-down handler that runs before the drawing one, for the pan button */
  onStageMouseDown?: (event: Konva.KonvaEventObject<MouseEvent>) => void;
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
  frame,
  animating = false,
  width,
  height,
  zoom = INITIAL_ZOOM,
  readOnly = false,
  selectedElementId = null,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTokenDragStart,
  onTokenMoved,
  onElementClick,
  onStageReady,
  onWheel,
  onStageMouseDown,
}: TacticStageViewProps) {
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  // The fit scale makes the map exactly as wide as the canvas; the zoom multiplies it.
  const fitScale = stageScale(width);
  const scale = fitScale * zoom.zoom;

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

    return pointer
      ? toMapPoint(
          { x: pointer.x - zoom.offset.x, y: pointer.y - zoom.offset.y },
          scale
        )
      : null;
  }

  // A stage 0 wide is an empty white box: better to draw nothing for the frame before the canvas
  // box has been measured than to hand Konva a size that renders nothing.
  if (width <= 0) {
    return null;
  }

  return (
    <Stage
      ref={(node) => onStageReady?.(node)}
      width={width}
      height={height ?? TACTIC_MAP_HEIGHT * fitScale}
      scaleX={scale}
      scaleY={scale}
      x={zoom.offset.x}
      y={zoom.offset.y}
      onWheel={onWheel}
      onMouseDown={(event) => {
        onStageMouseDown?.(event);
        // The middle button pans; only the primary one draws.
        if (event.evt.button !== PRIMARY_MOUSE_BUTTON) return;

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

      {/* Onion skin and trails read the map, they are not part of it: no pointer, and the export
          turns them off rather than baking them into a picture. */}
      <Layer listening={false}>
        {frame.ghosts.map((ghost) => (
          <ElementShape
            key={`ghost-${ghost.token.id}`}
            element={ghost.token}
            opacity={ghost.opacity}
            draggable={false}
            selected={false}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onClick={() => {}}
          />
        ))}
        {frame.tokens.map((unit) =>
          unit.trail ? (
            <Line
              key={`trail-${unit.token.id}`}
              points={unit.trail}
              stroke={tokenBorderHex(unit.token)}
              strokeWidth={TRAIL_STROKE_WIDTH}
              opacity={TRAIL_OPACITY}
              lineCap="round"
            />
          ) : null
        )}
      </Layer>

      <Layer>
        {frame.outgoing.elements.map((element) => (
          <ElementShape
            key={`out-${element.id}`}
            element={element}
            opacity={frame.outgoing.opacity}
            draggable={false}
            selected={false}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onClick={() => {}}
          />
        ))}
        {frame.incoming.elements.map((element) => (
          <ElementShape
            key={element.id}
            element={element}
            opacity={frame.incoming.opacity}
            draggable={false}
            selected={element.id === selectedElementId}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onClick={() => onElementClick?.(element.id)}
          />
        ))}
        {frame.tokens.map((unit) => (
          <ElementShape
            key={unit.token.id}
            element={unit.token}
            opacity={unit.opacity}
            draggable={!readOnly && !animating}
            selected={unit.token.id === selectedElementId}
            onDragStart={() => onTokenDragStart?.(unit.token.id)}
            onDragEnd={(x, y) => onTokenMoved?.(unit.token.id, x, y)}
            onClick={() => onElementClick?.(unit.token.id)}
          />
        ))}
      </Layer>
    </Stage>
  );
}

/** What a hovered token does to the pointer, and the state that draws its halo. */
interface TokenHover {
  /** Whether the pointer is on the token */
  hovered: boolean;
  /** Take the hover, and the cursor with it */
  onEnter: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Give both back */
  onLeave: (event: Konva.KonvaEventObject<MouseEvent>) => void;
}

/**
 * Hover state of one element, and the cursor that goes with it.
 *
 * Konva draws on a single canvas, so there is no element to put `cursor` on — the pointer belongs
 * to the stage, and the stage is what has to be told. That also means nothing releases the cursor
 * for a node that goes away under the pointer: the eraser deletes a hovered token without any
 * mouse-leave ever firing, so the container is remembered and cleared on unmount.
 * @param movable - Whether the element answers to a drag, and so earns the grab cursor
 * @returns The hover state and its two handlers
 */
function useTokenHover(movable: boolean): TokenHover {
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = "";
      }
    },
    []
  );

  /**
   * Point the container's cursor at a value, remembering the container on the way.
   * @param event - The Konva event the pointer came with
   * @param cursor - A CSS cursor, or "" to hand it back to the stylesheet
   */
  function setCursor(
    event: Konva.KonvaEventObject<MouseEvent>,
    cursor: string
  ): void {
    const container = event.target.getStage()?.container();

    if (container) {
      containerRef.current = container;
      container.style.cursor = cursor;
    }
  }

  return {
    hovered,
    onEnter: (event) => {
      setHovered(true);
      if (movable) setCursor(event, "grab");
    },
    onLeave: (event) => {
      setHovered(false);
      if (movable) setCursor(event, "");
    },
  };
}

interface ElementShapeProps {
  /** The element to draw */
  element: TacticElement;
  /** How solid to draw it, from 0 to 1. It comes from the frame, never from the element itself */
  opacity: number;
  /** Whether the element may be dragged */
  draggable: boolean;
  /** Whether to draw the selection ring */
  selected: boolean;
  /** Called when a drag starts, before any coordinate has changed */
  onDragStart: () => void;
  /** Called with the new map coordinates once a drag ended */
  onDragEnd: (x: number, y: number) => void;
  /** Called when the element was clicked */
  onClick: () => void;
}

/**
 * One element of the scene. Switching on `kind` and ending with `assertNever` is what turns a new
 * element type into a compile error rather than a shape that silently never draws.
 *
 * Opacity is handed in rather than read off the element: how solid a shape is belongs to the frame
 * being drawn, which is where a crossfade and an onion skin come from.
 * @param props - The element, how solid to draw it, and its interaction callbacks
 * @returns The Konva shape
 */
function ElementShape({
  element,
  opacity,
  draggable,
  selected,
  onDragStart,
  onDragEnd,
  onClick,
}: ElementShapeProps) {
  // Only a token reads this, but the hook has to run for every element kind all the same.
  const { hovered, onEnter, onLeave } = useTokenHover(draggable);

  switch (element.kind) {
    case "token": {
      const radius = TOKEN_RADIUS[element.size];
      const border = tokenBorderHex(element);

      return (
        <Group
          x={element.x}
          y={element.y}
          opacity={opacity}
          draggable={draggable}
          onClick={onClick}
          onTap={onClick}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onDragStart={onDragStart}
          onDragEnd={(event) => onDragEnd(event.target.x(), event.target.y())}
        >
          {/* Behind the token: the halo says which one the pointer is on before a click moves it. */}
          {hovered ? (
            <Circle
              radius={radius * HOVER_HALO_RATIO}
              fill={border}
              opacity={HOVER_HALO_OPACITY}
              listening={false}
            />
          ) : null}
          <Circle
            radius={radius}
            fill={TOKEN_FILL[element.color]}
            stroke={border}
            strokeWidth={selected ? 6 : 3}
          />
          <TokenArt
            icon={element.icon}
            radius={radius}
            color={COLOR_HEX[element.color]}
          />
          <Text
            text={element.label}
            fontSize={TOKEN_LABEL_FONT_SIZE}
            fill="#f5f5f5"
            align="center"
            width={radius * 6}
            x={-radius * 3}
            y={radius + TOKEN_LABEL_GAP}
            listening={false}
          />
        </Group>
      );
    }
    case "arrow":
      return (
        <Arrow
          points={element.points}
          opacity={opacity}
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
          opacity={opacity}
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
          opacity={opacity}
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

interface TokenArtProps {
  /** Icon key the token carries */
  icon: TacticTokenIcon;
  /** Radius of the token's circle, in map units */
  radius: number;
  /** Hex the icon is drawn in */
  color: string;
}

/**
 * What sits inside a token's circle: the flattened lucide artwork, or the digits of a numbered
 * team. Konva draws paths and text, never an SVG, so the two cases cannot share one shape.
 * @param props - The icon key, the circle it has to fit inside, and its colour
 * @returns The shapes inside the circle
 */
function TokenArt({ icon, radius, color }: TokenArtProps) {
  const art = tokenIcon(icon);

  switch (art.kind) {
    case "lucide": {
      const iconScale = (radius * 1.1) / TOKEN_ICON_BOX;

      return (
        <>
          {art.paths.map((data, index) => (
            <Path
              key={index}
              data={data}
              stroke={color}
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
        </>
      );
    }
    case "digits": {
      const fontSize = radius * DIGIT_FONT_RATIO;

      return (
        <Text
          text={art.digits}
          fontSize={fontSize}
          fontStyle="bold"
          fill={color}
          align="center"
          verticalAlign="middle"
          width={radius * 2}
          height={radius * 2}
          x={-radius}
          y={-radius}
          listening={false}
        />
      );
    }
    default:
      return assertNever(art);
  }
}
