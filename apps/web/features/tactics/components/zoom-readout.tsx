"use client";

import { Minus, Mouse, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ZOOM_FIT, ZOOM_MAX, ZOOM_MIN, zoomLabel } from "../lib/zoom";

interface ZoomReadoutProps {
  /** The current zoom, 1 meaning the map fits the canvas */
  zoom: number;
  /** Zoom in or out by one notch */
  onStep: (direction: 1 | -1) => void;
  /** Put the map back to filling the canvas */
  onReset: () => void;
}

/**
 * The zoom readout, pinned to the bottom right of the map: how far in the view is, plus the two
 * step buttons and the reset for anyone not using a wheel.
 *
 * It floats over the drawing, so it is built at the `xs` sizes throughout — the map is what the
 * admin is looking at, and a full-size control bar sits on top of the corner of it.
 *
 * A step button goes dead at its end of the range rather than clicking to no effect, and the mouse
 * hint beside them is the only place the middle-button drag is written down.
 * @param zoom - The current zoom
 * @param onStep - Zoom in or out by one notch
 * @param onReset - Put the map back to filling the canvas
 * @returns The readout
 */
export function ZoomReadout({ zoom, onStep, onReset }: ZoomReadoutProps) {
  return (
    <div className="pointer-events-auto absolute right-2 bottom-2 flex items-center gap-0.5 rounded-lg border bg-card/90 px-1 py-0.5 shadow-sm backdrop-blur-sm">
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label="Thu nhỏ"
        disabled={zoom <= ZOOM_MIN}
        title={
          zoom <= ZOOM_MIN
            ? `Nhỏ nhất là ${zoomLabel(ZOOM_MIN)}`
            : "Thu nhỏ"
        }
        onClick={() => onStep(-1)}
      >
        <Minus />
      </Button>
      <span className="min-w-10 text-center text-[11px] tabular-nums">
        {zoomLabel(zoom)}
      </span>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        aria-label="Phóng to"
        disabled={zoom >= ZOOM_MAX}
        title={
          zoom >= ZOOM_MAX ? `Lớn nhất là ${zoomLabel(ZOOM_MAX)}` : "Phóng to"
        }
        onClick={() => onStep(1)}
      >
        <Plus />
      </Button>

      <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />

      {/* Not a button: the drag is done on the map itself, and this only says so. */}
      <span
        className="flex items-center text-muted-foreground"
        title="Giữ chuột giữa để kéo bản đồ"
      >
        <Mouse className="size-3.5" />
        <span className="sr-only">Giữ chuột giữa để kéo bản đồ</span>
      </span>

      <div className="mx-0.5 h-4 w-px bg-border" aria-hidden />

      {/* Zoom 1 is both "100%" and "the map fits the canvas", so one button does both jobs. It
          stays enabled at 100%: a pan leaves the zoom alone and this is what re-centres the map. */}
      <Button
        type="button"
        size="xs"
        variant="ghost"
        aria-label="Đặt lại zoom 100%"
        title="Đặt lại zoom 100%"
        className="gap-1 px-1.5 text-[11px] tabular-nums"
        onClick={onReset}
      >
        <RotateCcw />
        {zoomLabel(ZOOM_FIT)}
      </Button>
    </div>
  );
}
