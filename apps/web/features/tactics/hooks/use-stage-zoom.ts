"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Konva from "konva";

import {
  INITIAL_ZOOM,
  ZOOM_STEP,
  clampOffset,
  panBy,
  zoomAt,
  type ZoomState,
} from "../lib/zoom";
import { stageViewport } from "../lib/stage-scale";

/** Mouse button that pans the map. The middle one, so it never fights with drawing. */
const PAN_BUTTON = 1;

/** What the canvas needs to be zoomable. */
export interface StageZoom {
  /** How far the map is zoomed in and how far it has been pushed */
  zoom: ZoomState;
  /** Whether a middle-button drag is under way, so the cursor can say so */
  panning: boolean;
  /** Wheel handler to hand to the Konva stage */
  onWheel: (event: Konva.KonvaEventObject<WheelEvent>) => void;
  /** Pointer-down handler that starts a pan on the middle button */
  onPanStart: (event: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Zoom in or out by one notch, around the middle of the canvas */
  step: (direction: 1 | -1) => void;
  /** Put the map back to filling the canvas */
  reset: () => void;
}

/**
 * Zooming and panning of the map: the wheel zooms around the pointer, the middle button drags.
 *
 * The drag is followed on `window`, not on the Konva stage: a pan that leaves the canvas — past
 * the palette, over the toolbar, out of the window — has to keep moving the map and has to end on
 * the mouse-up wherever that happens, and the stage only hears about pointers over itself.
 *
 * The zoom lives here rather than in the editor store because it is how one person is looking at
 * the drawing, not part of the drawing — it is never saved and never sent.
 * @param width - Width the canvas is rendered at, in CSS pixels
 * @returns The zoom state and the handlers that change it
 */
export function useStageZoom(width: number): StageZoom {
  const viewport = useMemo(() => stageViewport(width), [width]);
  const [requested, setZoom] = useState<ZoomState>(INITIAL_ZOOM);
  // Clamped on the way out as well as on every write: a canvas that changed size moves the limits
  // the offset lives inside with it, and the state was clamped against the old ones.
  const zoom = useMemo(
    () => clampOffset(requested, viewport),
    [requested, viewport]
  );
  const [panning, setPanning] = useState(false);
  // Where the pointer was at the last move. `movementX` would say the same thing, but it is
  // scaled by the display on some platforms and unset in others.
  const panFrom = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onWheel = useCallback(
    (event: Konva.KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault();

      const pointer = event.target.getStage()?.getPointerPosition();

      if (!pointer) {
        return;
      }

      const factor = event.evt.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;

      setZoom((current) => zoomAt(current, pointer, factor, viewport));
    },
    [viewport]
  );

  const onPanStart = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent>) => {
      if (event.evt.button !== PAN_BUTTON) {
        return;
      }

      // Without this the middle button opens the browser's own autoscroll instead of dragging.
      event.evt.preventDefault();
      panFrom.current = { x: event.evt.clientX, y: event.evt.clientY };
      setPanning(true);
    },
    []
  );

  useEffect(() => {
    if (!panning) {
      return;
    }

    /**
     * Move the map by however far the pointer went since the last event.
     * @param event - The window's mouse-move
     * @returns Nothing
     */
    const onMove = (event: MouseEvent) => {
      const deltaX = event.clientX - panFrom.current.x;
      const deltaY = event.clientY - panFrom.current.y;

      panFrom.current = { x: event.clientX, y: event.clientY };
      setZoom((current) => panBy(current, deltaX, deltaY, viewport));
    };

    const onUp = () => setPanning(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    // A window that loses focus mid-drag never gets the mouse-up.
    window.addEventListener("blur", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, [panning, viewport]);

  const step = useCallback(
    (direction: 1 | -1) => {
      const centre = { x: viewport.width / 2, y: viewport.height / 2 };
      const factor = direction === 1 ? ZOOM_STEP : 1 / ZOOM_STEP;

      setZoom((current) => zoomAt(current, centre, factor, viewport));
    },
    [viewport]
  );

  const reset = useCallback(() => setZoom(INITIAL_ZOOM), []);

  return { zoom, panning, onWheel, onPanStart, step, reset };
}
