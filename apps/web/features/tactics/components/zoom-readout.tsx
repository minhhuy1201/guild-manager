"use client";

import { Maximize2, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { zoomLabel } from "../lib/zoom";

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
 * buttons and the reset for anyone not using a wheel.
 * @param zoom - The current zoom
 * @param onStep - Zoom in or out by one notch
 * @param onReset - Put the map back to filling the canvas
 * @returns The readout
 */
export function ZoomReadout({ zoom, onStep, onReset }: ZoomReadoutProps) {
  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 flex items-center gap-1 rounded-lg border bg-card/90 px-2 py-1 shadow-sm backdrop-blur-sm">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Thu nhỏ"
        onClick={() => onStep(-1)}
      >
        <Minus />
      </Button>
      <span className="min-w-12 text-center text-xs tabular-nums">
        {zoomLabel(zoom)}
      </span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Phóng to"
        onClick={() => onStep(1)}
      >
        <Plus />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Vừa khung"
        title="Vừa khung"
        onClick={onReset}
      >
        <Maximize2 />
      </Button>
    </div>
  );
}
