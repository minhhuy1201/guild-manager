"use client";

import { useEffect, useState } from "react";
import type { TacticColor, TacticTokenSize } from "@guild/shared/enums";

import type { BuiltInToken } from "../lib/built-in-tokens";
import type { MapPoint } from "../lib/element-geometry";
import {
  COLOR_HEX,
  TOKEN_FILL,
  TOKEN_RADIUS,
  tokenBorderHex,
} from "../lib/token-icon";
import { TokenGlyph } from "./token-glyph";

/** Width of the ring, in map units - the canvas draws an unselected token's ring this wide. */
const RING_WIDTH = 3;

/** How much of the circle the icon spans, as on the canvas. */
const ICON_RATIO = 0.55;

interface PaletteDragPreviewProps {
  /** The palette entry being dragged */
  token: BuiltInToken;
  /** Colour the toolbar will give the dropped token */
  color: TacticColor;
  /** Size the toolbar will give the dropped token */
  size: TacticTokenSize;
  /** CSS pixels per map unit on the canvas right now, so the preview is as big as the drop */
  scale: number;
}

/**
 * The token being dragged out of the palette, drawn solid under the pointer.
 *
 * It stands in for the browser's own drag image, which is always faded and cannot be made opaque.
 * The pointer comes from `dragover` on the document, which fires wherever the drag goes - `drag` on
 * the source would be simpler, but Firefox reports 0 for its coordinates. Nothing shows until the
 * first `dragover`, since there is no position to draw at before it.
 * @param props - The entry, the colour and size it lands with, and the canvas scale
 * @returns The preview, or nothing before the pointer has been seen
 */
export function PaletteDragPreview({
  token,
  color,
  size,
  scale,
}: PaletteDragPreviewProps) {
  const [pointer, setPointer] = useState<MapPoint | null>(null);

  useEffect(() => {
    /**
     * Follow the pointer.
     * @param event - Any dragover on the page
     */
    function follow(event: DragEvent): void {
      setPointer({ x: event.clientX, y: event.clientY });
    }

    document.addEventListener("dragover", follow);

    return () => document.removeEventListener("dragover", follow);
  }, []);

  if (!pointer) {
    return null;
  }

  const diameter = TOKEN_RADIUS[size] * 2 * scale;

  return (
    <div
      data-testid="palette-drag-preview"
      aria-hidden
      className="pointer-events-none fixed z-50 flex items-center justify-center rounded-full border-solid shadow-lg"
      style={{
        left: pointer.x - diameter / 2,
        top: pointer.y - diameter / 2,
        width: diameter,
        height: diameter,
        borderWidth: RING_WIDTH * scale,
        borderColor: tokenBorderHex({ icon: token.icon, color }),
        backgroundColor: TOKEN_FILL[color],
        color: COLOR_HEX[color],
        fontSize: diameter * ICON_RATIO,
      }}
    >
      <TokenGlyph
        icon={token.icon}
        className="size-[1em] text-[length:inherit]"
      />
    </div>
  );
}
