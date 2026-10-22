"use client";

import { useEffect, useRef } from "react";

import { PHOTO_HEIGHT, PHOTO_WIDTH, drawPhotoFinish, type PhotoRow } from "../lib/draw-photo-finish";
import { formatLengths } from "../lib/race-lengths";

interface PhotoFinishPanelProps {
  /** The two cats in front, winner first */
  rows: readonly PhotoRow[];
  /** Cat bodies the runner-up is short of the line */
  lengthsBehind: number;
}

/**
 * The finish photo: the two leaders nose to nose at the line, on a canvas of its own.
 * @param props.rows - The two cats in front
 * @param props.lengthsBehind - The runner-up's gap in cat bodies
 * @returns The panel
 */
export function PhotoFinishPanel({ rows, lengthsBehind }: PhotoFinishPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    drawPhotoFinish(context, rows, getComputedStyle(canvas).fontFamily);
  }, [rows]);

  return (
    <div className="race-ov race-photo" role="img" aria-label={`Ảnh đích, cách ${formatLengths(lengthsBehind)} thân`}>
      <header className="race-display">
        <span>ẢNH ĐÍCH</span>
        <span>cách {formatLengths(lengthsBehind)} thân</span>
      </header>
      <canvas ref={canvasRef} width={PHOTO_WIDTH} height={PHOTO_HEIGHT} />
    </div>
  );
}
