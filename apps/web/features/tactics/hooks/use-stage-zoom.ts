"use client";

import { useCallback, useState } from "react";
import type Konva from "konva";

import {
  INITIAL_ZOOM,
  ZOOM_STEP,
  panBy,
  zoomAt,
  type ZoomState,
} from "../lib/zoom";
import { stageScale } from "../lib/stage-scale";

/** Mouse button that pans the map. The middle one, so it never fights with drawing. */
const PAN_BUTTON = 1;

/** What the canvas needs to be zoomable. */
export interface StageZoom {
  /** How far the map is zoomed in and how far it has been pushed */
  zoom: ZoomState;
  /** Wheel handler to hand to the Konva stage */
  onWheel: (event: Konva.KonvaEventObject<WheelEvent>) => void;
  /** Pointer-down handler that starts a pan on the middle button */
  onPanStart: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Pointer-move handler that continues a pan */
  onPanMove: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Pointer-up handler that ends a pan */
  onPanEnd: () => void;
  /** Zoom in or out by one notch, around the middle of the canvas */
  step: (direction: 1 | -1) => void;
  /** Put the map back to filling the canvas */
  reset: () => void;
}

/**
 * Zooming and panning of the map: the wheel zooms around the pointer, the middle button drags.
 *
 * The zoom lives here rather than in the editor store because it is how one person is looking at
 * the drawing, not part of the drawing — it is never saved and never sent.
 * @param width - Width the canvas is rendered at, in CSS pixels
 * @returns The zoom state and the handlers that change it
 */
export function useStageZoom(width: number): StageZoom {
  const [zoom, setZoom] = useState<ZoomState>(INITIAL_ZOOM);
  const [panningFrom, setPanningFrom] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const onWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();

      const pointer = event.target.getStage()?.getPointerPosition();

      if (!pointer) {
        return;
      }

      const factor = event.evt.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

      setZoom((current) =>
        zoomAt(current, pointer, factor, stageScale(width))
      );
    },
    [width]
  );

  const onPanStart = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent>) => {
      if (event.evt.button === PAN_BUTTON) {
        event.evt.preventDefault();
        setPanningFrom({ x: event.evt.clientX, y: event.evt.clientY });
      }
    },
    []
  );

  const onPanMove = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent>) => {
      if (!panningFrom) {
        return;
      }

      const deltaX = event.evt.clientX - panningFrom.x;
      const deltaY = event.evt.clientY - panningFrom.y;

      setPanningFrom({ x: event.evt.clientX, y: event.evt.clientY });
      setZoom((current) => panBy(current, deltaX, deltaY));
    },
    [panningFrom]
  );

  const onPanEnd = useCallback(() => setPanningFrom(null), []);

  const step = useCallback(
    (direction: 1 | -1) => {
      const centre = { x: width / 2, y: width / 4 };
      const factor = direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP;

      setZoom((current) => zoomAt(current, centre, factor, stageScale(width)));
    },
    [width]
  );

  const reset = useCallback(() => setZoom(INITIAL_ZOOM), []);

  return { zoom, onWheel, onPanStart, onPanMove, onPanEnd, step, reset };
}
